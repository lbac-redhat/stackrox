// Code generated by pg-bindings generator. DO NOT EDIT.

//go:build sql_integration

package postgres

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/stackrox/rox/generated/storage"
	"github.com/stackrox/rox/pkg/features"
	"github.com/stackrox/rox/pkg/postgres/pgtest"
	"github.com/stackrox/rox/pkg/sac"
	"github.com/stackrox/rox/pkg/testutils"
	"github.com/stackrox/rox/pkg/testutils/envisolator"
	"github.com/stretchr/testify/suite"
)

type LogImbuesStoreSuite struct {
	suite.Suite
	envIsolator *envisolator.EnvIsolator
	store       Store
	pool        *pgxpool.Pool
}

func TestLogImbuesStore(t *testing.T) {
	suite.Run(t, new(LogImbuesStoreSuite))
}

func (s *LogImbuesStoreSuite) SetupSuite() {
	s.envIsolator = envisolator.NewEnvIsolator(s.T())
	s.envIsolator.Setenv(features.PostgresDatastore.EnvVar(), "true")

	if !features.PostgresDatastore.Enabled() {
		s.T().Skip("Skip postgres store tests")
		s.T().SkipNow()
	}

	ctx := sac.WithAllAccess(context.Background())

	source := pgtest.GetConnectionString(s.T())
	config, err := pgxpool.ParseConfig(source)
	s.Require().NoError(err)
	pool, err := pgxpool.ConnectConfig(ctx, config)
	s.Require().NoError(err)

	Destroy(ctx, pool)

	s.pool = pool
	gormDB := pgtest.OpenGormDB(s.T(), source)
	defer pgtest.CloseGormDB(s.T(), gormDB)
	s.store = CreateTableAndNewStore(ctx, pool, gormDB)
}

func (s *LogImbuesStoreSuite) SetupTest() {
	ctx := sac.WithAllAccess(context.Background())
	tag, err := s.pool.Exec(ctx, "TRUNCATE log_imbues CASCADE")
	s.T().Log("log_imbues", tag)
	s.NoError(err)
}

func (s *LogImbuesStoreSuite) TearDownSuite() {
	if s.pool != nil {
		s.pool.Close()
	}
	s.envIsolator.RestoreAll()
}

func (s *LogImbuesStoreSuite) TestStore() {
	ctx := sac.WithAllAccess(context.Background())

	store := s.store

	logImbue := &storage.LogImbue{}
	s.NoError(testutils.FullInit(logImbue, testutils.SimpleInitializer(), testutils.JSONFieldsFilter))

	foundLogImbue, exists, err := store.Get(ctx, logImbue.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundLogImbue)

	withNoAccessCtx := sac.WithNoAccess(ctx)

	s.NoError(store.Upsert(ctx, logImbue))
	foundLogImbue, exists, err = store.Get(ctx, logImbue.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(logImbue, foundLogImbue)

	logImbueCount, err := store.Count(ctx)
	s.NoError(err)
	s.Equal(1, logImbueCount)
	logImbueCount, err = store.Count(withNoAccessCtx)
	s.NoError(err)
	s.Zero(logImbueCount)

	logImbueExists, err := store.Exists(ctx, logImbue.GetId())
	s.NoError(err)
	s.True(logImbueExists)
	s.NoError(store.Upsert(ctx, logImbue))
	s.ErrorIs(store.Upsert(withNoAccessCtx, logImbue), sac.ErrResourceAccessDenied)

	foundLogImbue, exists, err = store.Get(ctx, logImbue.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(logImbue, foundLogImbue)

	s.NoError(store.Delete(ctx, logImbue.GetId()))
	foundLogImbue, exists, err = store.Get(ctx, logImbue.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundLogImbue)
	s.ErrorIs(store.Delete(withNoAccessCtx, logImbue.GetId()), sac.ErrResourceAccessDenied)

	var logImbues []*storage.LogImbue
	for i := 0; i < 200; i++ {
		logImbue := &storage.LogImbue{}
		s.NoError(testutils.FullInit(logImbue, testutils.UniqueInitializer(), testutils.JSONFieldsFilter))
		logImbues = append(logImbues, logImbue)
	}

	s.NoError(store.UpsertMany(ctx, logImbues))
	allLogImbue, err := store.GetAll(ctx)
	s.NoError(err)
	s.ElementsMatch(logImbues, allLogImbue)

	logImbueCount, err = store.Count(ctx)
	s.NoError(err)
	s.Equal(200, logImbueCount)
}
