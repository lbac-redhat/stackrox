package m103tom104

import (
	"testing"

	"github.com/gogo/protobuf/proto"
	"github.com/stackrox/rox/generated/storage"
	"github.com/stackrox/rox/migrator/migrations/rocksdbmigration"
	"github.com/stackrox/rox/migrator/rockshelper"
	dbTypes "github.com/stackrox/rox/migrator/types"
	"github.com/stackrox/rox/pkg/rocksdb"
	"github.com/stackrox/rox/pkg/testutils/rocksdbtest"
	"github.com/stretchr/testify/suite"
)

func TestMigration(t *testing.T) {
	suite.Run(t, new(cveFieldMigration))
}

type cveFieldMigration struct {
	suite.Suite

	db        *rocksdb.RocksDB
	databases *dbTypes.Databases
}

func (suite *cveFieldMigration) SetupTest() {
	rocksDB, err := rocksdb.NewTemp(suite.T().Name())
	suite.NoError(err)

	suite.db = rocksDB
	suite.databases = &dbTypes.Databases{RocksDB: rocksDB.DB}
}

func (suite *cveFieldMigration) TearDownTest() {
	rocksdbtest.TearDownRocksDB(suite.db)
}

func (suite *cveFieldMigration) TestImagesCVEEdgeMigration() {
	vulns := []*storage.CVE{
		{
			Id: "cve1",
		},
		{
			Id: "cve2",
		},
		{
			Id: "cve3",
		},
	}

	for _, obj := range vulns {
		key := rocksdbmigration.GetPrefixedKey(cvePrefix, []byte(obj.GetId()))
		value, err := proto.Marshal(obj)
		suite.NoError(err)
		suite.NoError(suite.databases.RocksDB.Put(writeOpts, key, value))
	}

	err := writeCVEField(suite.databases.RocksDB)
	suite.NoError(err)

	for _, vuln := range vulns {
		msg, exists, err := rockshelper.ReadFromRocksDB(suite.databases.RocksDB, readOpts, &storage.CVE{}, cvePrefix, []byte(vuln.GetId()))
		suite.NoError(err)
		suite.True(exists)
		vuln := msg.(*storage.CVE)
		suite.EqualValues(vuln.GetId(), vuln.GetCve())
	}
}
