package m103tom104

import (
	"github.com/gogo/protobuf/proto"
	"github.com/pkg/errors"
	"github.com/stackrox/rox/generated/storage"
	"github.com/stackrox/rox/migrator/migrations"
	"github.com/stackrox/rox/migrator/types"
	"github.com/tecbot/gorocksdb"
)

const (
	batchSize = 500
)

var (
	cvePrefix = []byte("image_vuln")

	migration = types.Migration{
		StartingSeqNum: 103,
		VersionAfter:   storage.Version{SeqNum: 104},
		Run: func(databases *types.Databases) error {
			if err := writeCVEField(databases.RocksDB); err != nil {
				return errors.Wrap(err, "error migrating cves")
			}
			return nil
		},
	}

	readOpts  = gorocksdb.NewDefaultReadOptions()
	writeOpts = gorocksdb.NewDefaultWriteOptions()
)

func init() {
	migrations.MustRegisterMigration(migration)
}

func writeCVEField(db *gorocksdb.DB) error {
	it := db.NewIterator(readOpts)
	defer it.Close()

	wb := gorocksdb.NewWriteBatch()
	for it.Seek(cvePrefix); it.ValidForPrefix(cvePrefix); it.Next() {
		key := it.Key().Copy()
		vuln := &storage.CVE{}
		if err := proto.Unmarshal(it.Value().Data(), vuln); err != nil {
			return errors.Wrapf(err, "unmarshaling cve %s", key)
		}
		vuln.Cve = vuln.GetId()

		newData, err := proto.Marshal(vuln)
		if err != nil {
			return errors.Wrapf(err, "marshaling cve %s", key)
		}
		wb.Put(key, newData)

		if wb.Count() == batchSize {
			if err := db.Write(writeOpts, wb); err != nil {
				return errors.Wrap(err, "writing to RocksDB")
			}
			wb.Clear()
		}
	}

	if wb.Count() != 0 {
		if err := db.Write(writeOpts, wb); err != nil {
			return errors.Wrap(err, "writing final batch to RocksDB")
		}
	}
	return nil
}
