import React, { useState } from 'react';
import {
    Flex,
    FlexItem,
    Title,
    Button,
    Dropdown,
    DropdownToggle,
    Form,
    FormGroup,
} from '@patternfly/react-core';
import { useQuery, gql } from '@apollo/client';

import LinkShim from 'Components/PatternFly/LinkShim';
import useURLSearch from 'hooks/useURLSearch';
import { getRequestQueryStringForSearchFilter } from 'utils/searchUtils';
import useSelectToggle from 'hooks/patternfly/useSelectToggle';
import pluralize from 'pluralize';
import { isInteger } from 'lodash';
import { SearchFilter } from 'types/search';
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

const fieldIdPrefix = 'aging-images';

function getWidgetTitle(
    searchFilter: SearchFilter,
    selectedTimeRanges: TimeRangeTuple,
    timeRangeCounts?: TimeRangeCounts
): string {
    if (!timeRangeCounts) {
        return 'Aging images';
    }

    let totalImages = 0;

    selectedTimeRanges.forEach((range, index) => {
        if (typeof range === 'number') {
            totalImages += timeRangeCounts[`timeRange${index}`];
        }
    });

    const isActiveImages = Boolean(searchFilter.Cluster) || Boolean(searchFilter['Namespace ID']);
    const isSingular = totalImages === 1;

    if (isActiveImages && isSingular) {
        return `${totalImages} Active aging image`;
    }
    if (isActiveImages && !isSingular) {
        return `${totalImages} Active aging images`;
    }
    if (!isActiveImages && isSingular) {
        return `${totalImages} Aging image`;
    }
    return `${totalImages} Aging images`;
}

function AgingImages() {
    const { isOpen: isOptionsOpen, onToggle: toggleOptionsOpen } = useSelectToggle();
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
                        <Title headingLevel="h2">
                            {getWidgetTitle(searchFilter, selectedTimeRanges, data)}
                        </Title>
                    </FlexItem>
                    <FlexItem>
                        <Dropdown
                            className="pf-u-mr-sm"
                            toggle={
                                <DropdownToggle
                                    id={`${fieldIdPrefix}-options-toggle`}
                                    toggleVariant="secondary"
                                    onToggle={toggleOptionsOpen}
                                >
                                    Options
                                </DropdownToggle>
                            }
                            position="right"
                            isOpen={isOptionsOpen}
                        >
                            <Form className="pf-u-px-md pf-u-py-sm">
                                <FormGroup
                                    fieldId={`${fieldIdPrefix}-time-ranges`}
                                    label="Image age values"
                                />
                            </Form>
                        </Dropdown>
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
