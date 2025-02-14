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

type ImageComponentsStoreSuite struct {
	suite.Suite
	envIsolator *envisolator.EnvIsolator
	store       Store
	pool        *pgxpool.Pool
}

func TestImageComponentsStore(t *testing.T) {
	suite.Run(t, new(ImageComponentsStoreSuite))
}

func (s *ImageComponentsStoreSuite) SetupSuite() {
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

func (s *ImageComponentsStoreSuite) SetupTest() {
	ctx := sac.WithAllAccess(context.Background())
	tag, err := s.pool.Exec(ctx, "TRUNCATE image_components CASCADE")
	s.T().Log("image_components", tag)
	s.NoError(err)
}

func (s *ImageComponentsStoreSuite) TearDownSuite() {
	if s.pool != nil {
		s.pool.Close()
	}
	s.envIsolator.RestoreAll()
}

func (s *ImageComponentsStoreSuite) TestStore() {
	ctx := sac.WithAllAccess(context.Background())

	store := s.store

	imageComponent := &storage.ImageComponent{}
	s.NoError(testutils.FullInit(imageComponent, testutils.SimpleInitializer(), testutils.JSONFieldsFilter))

	foundImageComponent, exists, err := store.Get(ctx, imageComponent.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundImageComponent)

	withNoAccessCtx := sac.WithNoAccess(ctx)

	s.NoError(store.Upsert(ctx, imageComponent))
	foundImageComponent, exists, err = store.Get(ctx, imageComponent.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(imageComponent, foundImageComponent)

	imageComponentCount, err := store.Count(ctx)
	s.NoError(err)
	s.Equal(1, imageComponentCount)
	imageComponentCount, err = store.Count(withNoAccessCtx)
	s.NoError(err)
	s.Zero(imageComponentCount)

	imageComponentExists, err := store.Exists(ctx, imageComponent.GetId())
	s.NoError(err)
	s.True(imageComponentExists)
	s.NoError(store.Upsert(ctx, imageComponent))
	s.ErrorIs(store.Upsert(withNoAccessCtx, imageComponent), sac.ErrResourceAccessDenied)

	foundImageComponent, exists, err = store.Get(ctx, imageComponent.GetId())
	s.NoError(err)
	s.True(exists)
	s.Equal(imageComponent, foundImageComponent)

	s.NoError(store.Delete(ctx, imageComponent.GetId()))
	foundImageComponent, exists, err = store.Get(ctx, imageComponent.GetId())
	s.NoError(err)
	s.False(exists)
	s.Nil(foundImageComponent)
	s.NoError(store.Delete(withNoAccessCtx, imageComponent.GetId()))

	var imageComponents []*storage.ImageComponent
	for i := 0; i < 200; i++ {
		imageComponent := &storage.ImageComponent{}
		s.NoError(testutils.FullInit(imageComponent, testutils.UniqueInitializer(), testutils.JSONFieldsFilter))
		imageComponents = append(imageComponents, imageComponent)
	}

	s.NoError(store.UpsertMany(ctx, imageComponents))

	imageComponentCount, err = store.Count(ctx)
	s.NoError(err)
	s.Equal(200, imageComponentCount)
}
