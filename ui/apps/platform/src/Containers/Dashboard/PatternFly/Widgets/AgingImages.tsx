import React, { useState, useCallback } from 'react';
import {
    Flex,
    FlexItem,
    Title,
    Button,
    Dropdown,
    DropdownToggle,
    Form,
    FormGroup,
    Checkbox,
    TextInput,
} from '@patternfly/react-core';
import { useQuery, gql } from '@apollo/client';

import LinkShim from 'Components/PatternFly/LinkShim';
import useURLSearch from 'hooks/useURLSearch';
import { getRequestQueryStringForSearchFilter } from 'utils/searchUtils';
import useSelectToggle from 'hooks/patternfly/useSelectToggle';
import { SearchFilter } from 'types/search';
import WidgetCard from './WidgetCard';
import AgingImagesChart, {
    TimeRangeCounts,
    TimeRangeTupleIndex,
    TimeRangeTuple,
    timeRangeTupleIndices,
} from './AgingImagesChart';

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
            // TODO Is this correct? Validate if each bar should be cumulative or separate
            // Should be "separate", i.e. distribution
            totalImages = Infinity;
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

function updateAt<T extends TimeRangeTuple>(
    tuple: T,
    index: TimeRangeTupleIndex,
    value: T[number]
): T {
    const newTuple: T = [...tuple];
    newTuple[index] = value;
    return newTuple;
}

function AgingImages() {
    const { isOpen: isOptionsOpen, onToggle: toggleOptionsOpen } = useSelectToggle();
    const { searchFilter } = useURLSearch();
    const [defaultTimeRanges, setDefaultTimeRanges] = useState<Required<TimeRangeTuple>>([
        30, 90, 180, 365,
    ]);
    const [selectedTimeRanges, setSelectedTimeRanges] = useState<TimeRangeTuple>([
        ...defaultTimeRanges,
    ]);

    const toggleTimeRange = useCallback(
        (index) => {
            const newValue =
                typeof selectedTimeRanges[index] === 'undefined'
                    ? defaultTimeRanges[index]
                    : undefined;

            setSelectedTimeRanges(updateAt(selectedTimeRanges, index, newValue));
        },
        [selectedTimeRanges, defaultTimeRanges]
    );

    const onTimeRangeChange = useCallback(
        (value: string, index: TimeRangeTupleIndex): void => {
            if (!/^\d+$/.test(value)) {
                return;
            }
            const newTimeRange = parseInt(value, 10);

            const lowerBounds = [0, ...defaultTimeRanges.slice(0, 3)];
            const upperBounds = [...defaultTimeRanges.slice(1, 4), Infinity];

            if (newTimeRange > lowerBounds[index] && newTimeRange < upperBounds[index]) {
                setDefaultTimeRanges(updateAt(defaultTimeRanges, index, newTimeRange));
                if (typeof selectedTimeRanges[index] === 'number') {
                    setSelectedTimeRanges(updateAt(selectedTimeRanges, index, newTimeRange));
                }
            }
        },
        [defaultTimeRanges, selectedTimeRanges]
    );

    const variables = Object.fromEntries(
        selectedTimeRanges.map((range, index) => [
            `query${index}`,
            getRequestQueryStringForSearchFilter({
                ...searchFilter,
                'Image Created Time': `>${range ?? 0}d`,
            }),
        ])
    );

    const { data, previousData, loading, error } = useQuery<TimeRangeCounts>(imageCountQuery, {
        variables,
    });

    const timeRangeCounts = data ?? previousData;

    return (
        <WidgetCard
            isLoading={loading && !timeRangeCounts}
            error={error}
            header={
                <Flex direction={{ default: 'row' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                        <Title headingLevel="h2">
                            {getWidgetTitle(searchFilter, selectedTimeRanges, timeRangeCounts)}
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
                                    fieldId={`${fieldIdPrefix}-time-range-0`}
                                    label="Image age values"
                                >
                                    {timeRangeTupleIndices.map((n) => (
                                        <div key={n}>
                                            <Checkbox
                                                aria-label="Toggle image time range"
                                                id={`${fieldIdPrefix}-time-range-${n}`}
                                                name={`${fieldIdPrefix}-time-range-${n}`}
                                                className="pf-u-mb-sm pf-u-display-flex pf-u-align-items-center"
                                                isChecked={
                                                    typeof selectedTimeRanges[n] !== 'undefined'
                                                }
                                                onChange={() => toggleTimeRange(n)}
                                                label={
                                                    <TextInput
                                                        aria-label="Image age in days"
                                                        style={{ minWidth: '100px' }}
                                                        onChange={(val) =>
                                                            onTimeRangeChange(val, n)
                                                        }
                                                        type="number"
                                                        value={defaultTimeRanges[n]}
                                                    />
                                                }
                                            />
                                        </div>
                                    ))}
                                </FormGroup>
                            </Form>
                        </Dropdown>
                        <Button variant="secondary" component={LinkShim} href="TODO">
                            View All
                        </Button>
                    </FlexItem>
                </Flex>
            }
        >
            {timeRangeCounts && (
                <AgingImagesChart
                    searchFilter={searchFilter}
                    selectedTimeRanges={selectedTimeRanges}
                    timeRangeCounts={timeRangeCounts}
                />
            )}
        </WidgetCard>
    );
}

export default AgingImages;
