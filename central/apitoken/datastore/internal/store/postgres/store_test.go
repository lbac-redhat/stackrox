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

type ApiTokensStoreSuite struct {
	suite.Suite
	envIsolator *envisolator.EnvIsolator
	store       Store
	pool        *pgxpool.Pool
}

func TestApiTokensStore(t *testing.T) {
	suite.Run(t, new(ApiTokensStoreSuite))
}

func (s *ApiTokensStoreSuite) SetupSuite() {
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

func (s *ApiTokensStoreSuite) SetupTest() {
	ctx := sac.WithAllAccess(context.Background())
	tag, err := s.pool.Exec(ctx, "TRUNCATE api_tokens CASCADE")
	s.T().Log("api_tokens", tag)
	s.NoError(err)
}

func (s *ApiTokensStoreSuite) TearDownSuite() {
	if s.pool != nil {
		s.pool.Close()
	}
	s.envIsolator.RestoreAll()
}

func (s *ApiTokensStoreSuite) TestStore() {
	ctx := sac.WithAllAccess(context.Background())

	store := s.store

	tokenMetadata := &storage.TokenMetadata{}
	s.NoError(testutils.FullInit(tokenMetadata, testutils.SimpleInitializer(), testutils.JSONFieldsFilter))

	foundTokenMetadata, exists, err := store.Get(ctx, tokenMetadata.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundTokenMetadata)

	withNoAccessCtx := sac.WithNoAccess(ctx)

	s.NoError(store.Upsert(ctx, tokenMetadata))
	foundTokenMetadata, exists, err = store.Get(ctx, tokenMetadata.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(tokenMetadata, foundTokenMetadata)

	tokenMetadataCount, err := store.Count(ctx)
	s.NoError(err)
	s.Equal(1, tokenMetadataCount)
	tokenMetadataCount, err = store.Count(withNoAccessCtx)
	s.NoError(err)
	s.Zero(tokenMetadataCount)

	tokenMetadataExists, err := store.Exists(ctx, tokenMetadata.GetId())
	s.NoError(err)
	s.True(tokenMetadataExists)
	s.NoError(store.Upsert(ctx, tokenMetadata))
	s.ErrorIs(store.Upsert(withNoAccessCtx, tokenMetadata), sac.ErrResourceAccessDenied)

	foundTokenMetadata, exists, err = store.Get(ctx, tokenMetadata.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(tokenMetadata, foundTokenMetadata)

	s.NoError(store.Delete(ctx, tokenMetadata.GetId()))
	foundTokenMetadata, exists, err = store.Get(ctx, tokenMetadata.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundTokenMetadata)
	s.ErrorIs(store.Delete(withNoAccessCtx, tokenMetadata.GetId()), sac.ErrResourceAccessDenied)

	var tokenMetadatas []*storage.TokenMetadata
	for i := 0; i < 200; i++ {
		tokenMetadata := &storage.TokenMetadata{}
		s.NoError(testutils.FullInit(tokenMetadata, testutils.UniqueInitializer(), testutils.JSONFieldsFilter))
		tokenMetadatas = append(tokenMetadatas, tokenMetadata)
	}

	s.NoError(store.UpsertMany(ctx, tokenMetadatas))

	tokenMetadataCount, err = store.Count(ctx)
	s.NoError(err)
	s.Equal(200, tokenMetadataCount)
}
