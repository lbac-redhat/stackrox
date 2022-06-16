import React, { useState } from 'react';
import { Flex, FlexItem, Title, Button } from '@patternfly/react-core';
import { useQuery, gql } from '@apollo/client';

import LinkShim from 'Components/PatternFly/LinkShim';
import useURLSearch from 'hooks/useURLSearch';
import WidgetCard from './WidgetCard';
import AgingImagesChart from './AgingImagesChart';

type AgingImagesQueryResponse = {
    timeRange1?: number;
    timeRange2?: number;
    timeRange3?: number;
    timeRange4?: number;
};

function AgingImages() {
    const { searchFilter } = useURLSearch();
    const [selectedTimeRanges, setSelectedTimeRanges] = useState<number[]>([30, 90, 180, 366]);

    const query = '';

    const gqlQuery = gql`
        query q {
            timeRange1: imageCount(query: "Image Created Time:>30d")
            timeRange2: imageCount(query: "Image Created Time:>90d")
            timeRange3: imageCount(query: "Image Created Time:>180d")
            timeRange4: imageCount(query: "Image Created Time:>366d")
        }
    `;

    const { data, loading, error } = useQuery<AgingImagesQueryResponse>(gqlQuery);

    return (
        <WidgetCard
            isLoading={loading}
            error={error}
            header={
                <Flex direction={{ default: 'row' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                        <Title headingLevel="h2">{20} TODO Active/All aging images</Title>
                    </FlexItem>
                    <FlexItem>
                        <Button variant="secondary" component={LinkShim} href="TODO">
                            View All
                        </Button>
                    </FlexItem>
                </Flex>
            }
        >
            <AgingImagesChart timeRangeCounts={data ?? {}} />
        </WidgetCard>
    );
}

export default AgingImages;
