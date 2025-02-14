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

type ComplianceOperatorProfilesStoreSuite struct {
	suite.Suite
	envIsolator *envisolator.EnvIsolator
	store       Store
	pool        *pgxpool.Pool
}

func TestComplianceOperatorProfilesStore(t *testing.T) {
	suite.Run(t, new(ComplianceOperatorProfilesStoreSuite))
}

func (s *ComplianceOperatorProfilesStoreSuite) SetupSuite() {
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

func (s *ComplianceOperatorProfilesStoreSuite) SetupTest() {
	ctx := sac.WithAllAccess(context.Background())
	tag, err := s.pool.Exec(ctx, "TRUNCATE compliance_operator_profiles CASCADE")
	s.T().Log("compliance_operator_profiles", tag)
	s.NoError(err)
}

func (s *ComplianceOperatorProfilesStoreSuite) TearDownSuite() {
	if s.pool != nil {
		s.pool.Close()
	}
	s.envIsolator.RestoreAll()
}

func (s *ComplianceOperatorProfilesStoreSuite) TestStore() {
	ctx := sac.WithAllAccess(context.Background())

	store := s.store

	complianceOperatorProfile := &storage.ComplianceOperatorProfile{}
	s.NoError(testutils.FullInit(complianceOperatorProfile, testutils.SimpleInitializer(), testutils.JSONFieldsFilter))

	foundComplianceOperatorProfile, exists, err := store.Get(ctx, complianceOperatorProfile.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundComplianceOperatorProfile)

	withNoAccessCtx := sac.WithNoAccess(ctx)

	s.NoError(store.Upsert(ctx, complianceOperatorProfile))
	foundComplianceOperatorProfile, exists, err = store.Get(ctx, complianceOperatorProfile.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(complianceOperatorProfile, foundComplianceOperatorProfile)

	complianceOperatorProfileCount, err := store.Count(ctx)
	s.NoError(err)
	s.Equal(1, complianceOperatorProfileCount)
	complianceOperatorProfileCount, err = store.Count(withNoAccessCtx)
	s.NoError(err)
	s.Zero(complianceOperatorProfileCount)

	complianceOperatorProfileExists, err := store.Exists(ctx, complianceOperatorProfile.GetId())
	s.NoError(err)
	s.True(complianceOperatorProfileExists)
	s.NoError(store.Upsert(ctx, complianceOperatorProfile))
	s.ErrorIs(store.Upsert(withNoAccessCtx, complianceOperatorProfile), sac.ErrResourceAccessDenied)

	foundComplianceOperatorProfile, exists, err = store.Get(ctx, complianceOperatorProfile.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(complianceOperatorProfile, foundComplianceOperatorProfile)

	s.NoError(store.Delete(ctx, complianceOperatorProfile.GetId()))
	foundComplianceOperatorProfile, exists, err = store.Get(ctx, complianceOperatorProfile.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundComplianceOperatorProfile)
	s.ErrorIs(store.Delete(withNoAccessCtx, complianceOperatorProfile.GetId()), sac.ErrResourceAccessDenied)

	var complianceOperatorProfiles []*storage.ComplianceOperatorProfile
	for i := 0; i < 200; i++ {
		complianceOperatorProfile := &storage.ComplianceOperatorProfile{}
		s.NoError(testutils.FullInit(complianceOperatorProfile, testutils.UniqueInitializer(), testutils.JSONFieldsFilter))
		complianceOperatorProfiles = append(complianceOperatorProfiles, complianceOperatorProfile)
	}

	s.NoError(store.UpsertMany(ctx, complianceOperatorProfiles))

	complianceOperatorProfileCount, err = store.Count(ctx)
	s.NoError(err)
	s.Equal(200, complianceOperatorProfileCount)
}
