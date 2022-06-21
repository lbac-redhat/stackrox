import React, { useReducer, useCallback } from 'react';
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
import cloneDeep from 'lodash/cloneDeep';

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

export const imageCountQuery = gql`
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

    const totalImages =
        Object.values(timeRangeCounts).find((range, index) => {
            return selectedTimeRanges[index].enabled;
        }) ?? 0;

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

function distributeTimeRangeCounts(data: TimeRangeCounts): TimeRangeCounts {
    return {
        timeRange0: data.timeRange0 - data.timeRange1,
        timeRange1: data.timeRange1 - data.timeRange2,
        timeRange2: data.timeRange2 - data.timeRange3,
        timeRange3: data.timeRange3,
    };
}

const defaultTimeRanges: TimeRangeTuple = [
    { enabled: true, value: 30 },
    { enabled: true, value: 90 },
    { enabled: true, value: 180 },
    { enabled: true, value: 365 },
];

type TimeRangeAction =
    | {
          type: 'toggle';
          index: TimeRangeTupleIndex;
      }
    | {
          type: 'update';
          index: TimeRangeTupleIndex;
          value: number;
      };

function timeRangeReducer(state: TimeRangeTuple, action: TimeRangeAction) {
    const nextState = cloneDeep(state);
    switch (action.type) {
        case 'toggle':
            nextState[action.index].enabled = !nextState[action.index].enabled;
            return nextState;
        case 'update':
            nextState[action.index].value = action.value;
            return nextState;
        default:
            return nextState;
    }
}

function AgingImages() {
    const { isOpen: isOptionsOpen, onToggle: toggleOptionsOpen } = useSelectToggle();
    const { searchFilter } = useURLSearch();
    const [timeRanges, dispatch] = useReducer(timeRangeReducer, defaultTimeRanges);

    const toggleTimeRange = useCallback((index) => {
        dispatch({ type: 'toggle', index });
    }, []);

    const onTimeRangeChange = useCallback((value: string, index: TimeRangeTupleIndex): void => {
        if (!/^\d+$/.test(value)) {
            return;
        }
        const newTimeRange = parseInt(value, 10);
        const lowerBounds = [0, ...defaultTimeRanges.slice(0, 3)];
        const upperBounds = [...defaultTimeRanges.slice(1, 4), Infinity];

        if (newTimeRange > lowerBounds[index] && newTimeRange < upperBounds[index]) {
            dispatch({ type: 'update', index, value: newTimeRange });
        }
    }, []);

    const variables = {};
    timeRanges.forEach(({ value }, index) => {
        variables[`query${index}`] = getRequestQueryStringForSearchFilter({
            ...searchFilter,
            'Image Created Time': `>${value ?? 0}d`,
        });
    });

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
                            {getWidgetTitle(searchFilter, timeRanges, timeRangeCounts)}
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
                                                isChecked={timeRanges[n].enabled}
                                                onChange={() => toggleTimeRange(n)}
                                                label={
                                                    <TextInput
                                                        aria-label="Image age in days"
                                                        style={{ minWidth: '100px' }}
                                                        onChange={(val) =>
                                                            onTimeRangeChange(val, n)
                                                        }
                                                        type="number"
                                                        value={timeRanges[n].value}
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
                    timeRanges={timeRanges}
                    timeRangeCounts={distributeTimeRangeCounts(timeRangeCounts)}
                />
            )}
        </WidgetCard>
    );
}

export default AgingImages;
