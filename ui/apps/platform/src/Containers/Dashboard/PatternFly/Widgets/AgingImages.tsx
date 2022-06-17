import React, { useState } from 'react';
import { Flex, FlexItem, Title, Button } from '@patternfly/react-core';
import { useQuery, gql } from '@apollo/client';

import LinkShim from 'Components/PatternFly/LinkShim';
import useURLSearch from 'hooks/useURLSearch';
import { getRequestQueryStringForSearchFilter } from 'utils/searchUtils';
import WidgetCard from './WidgetCard';
import AgingImagesChart, { TimeRangeCounts, TimeRangeTuple } from './AgingImagesChart';

const imageCountQuery = gql`
    query agingImagesQuery(
        $query0: String = ""
        $query1: String = ""
        $query2: String = ""
        $query3: String = ""
    ) {
        timeRange0: imageCount(query: $query0)
        timeRange1: imageCount(query: $query1)
        timeRange2: imageCount(query: $query2)
        timeRange3: imageCount(query: $query3)
    }
`;

function AgingImages() {
    const { searchFilter } = useURLSearch();
    const [selectedTimeRanges, setSelectedTimeRanges] = useState<TimeRangeTuple>([
        30, 90, 180, 365,
    ]);

    const variables = Object.fromEntries(
        selectedTimeRanges.map((range, index) => [
            `query${index}`,
            getRequestQueryStringForSearchFilter({
                ...searchFilter,
                'Image Created Time': `>${range ?? 0}d`,
            }),
        ])
    );

    const { data, loading, error } = useQuery<TimeRangeCounts>(imageCountQuery, {
        variables,
    });

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
            {data && (
                <AgingImagesChart
                    searchFilter={searchFilter}
                    selectedTimeRanges={selectedTimeRanges}
                    timeRangeCounts={data}
                />
            )}
        </WidgetCard>
    );
}

export default AgingImages;
