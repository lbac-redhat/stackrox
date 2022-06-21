import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Chart, ChartAxis, ChartBar, ChartLabelProps } from '@patternfly/react-charts';

import useResizeObserver from 'hooks/useResizeObserver';
import {
    defaultChartHeight,
    defaultChartBarWidth,
    patternflySeverityTheme,
    navigateOnClickEvent,
    severityColorScale,
} from 'utils/chartUtils';
import { LinkableChartLabel } from 'Components/PatternFly/Charts/LinkableChartLabel';
import { SearchFilter } from 'types/search';
import { vulnManagementImagesPath } from 'routePaths';
import { getQueryString } from 'utils/queryStringUtils';

export type TimeRange = { enabled: boolean; value: number };
export type TimeRangeTuple = [TimeRange, TimeRange, TimeRange, TimeRange];
export const timeRangeTupleIndices = [0, 1, 2, 3] as const;
export type TimeRangeTupleIndex = typeof timeRangeTupleIndices[number];
export type TimeRangeCounts = Record<`timeRange${TimeRangeTupleIndex}`, number>;

export type ChartData = {
    barData: { x: string; y: number }[];
    labelLink: string;
    labelText: string;
    fill: string;
};

export type AgingImagesChartProps = {
    searchFilter: SearchFilter;
    timeRanges: TimeRangeTuple;
    timeRangeCounts: TimeRangeCounts;
};

function linkForAgingImages(searchFilter: SearchFilter, ageRange: number) {
    const queryString = getQueryString({
        s: {
            ...searchFilter,
            'Image Created Time': `>${ageRange}d`,
        },
        sort: [{ id: 'Image Created Time', desc: 'false' }],
    });
    return `${vulnManagementImagesPath}${queryString}`;
}

function yAxisTitle(searchFilter: SearchFilter) {
    const isActiveImages = Boolean(searchFilter.Cluster) || Boolean(searchFilter['Namespace ID']);

    return isActiveImages ? 'Active images' : 'All images';
}

const labelLinkCallback = ({ datum }: ChartLabelProps, chartData: ChartData[]) => {
    return typeof datum === 'number' ? chartData[datum - 1].labelLink : '';
};

const labelTextCallback = ({ datum }: ChartLabelProps, chartData: ChartData[]) => {
    return typeof datum === 'number' ? chartData[datum - 1].labelText : '';
};

function makeChartData(
    searchFilter: SearchFilter,
    timeRanges: TimeRangeTuple,
    data: TimeRangeCounts
): ChartData[] {
    const chartData: ChartData[] = [];

    timeRangeTupleIndices.forEach((index) => {
        const { value, enabled } = timeRanges[index];
        const nextEnabledRange = timeRanges
            .slice(index + 1)
            .find(({ enabled: nextEnabled }) => nextEnabled);
        const nextEnabledIndex =
            typeof nextEnabledRange === 'undefined' ? -1 : timeRanges.indexOf(nextEnabledRange);

        if (enabled) {
            const currentCount = data[`timeRange${index}`];
            const x = String(value);
            const y =
                nextEnabledIndex !== -1
                    ? currentCount - data[`timeRange${nextEnabledIndex}`]
                    : currentCount;
            const barData = [{ x, y }];
            const fill = severityColorScale[index];
            const labelLink = linkForAgingImages(searchFilter, value);
            const labelText =
                typeof nextEnabledRange === 'undefined'
                    ? `>${value} days`
                    : `${value}-${nextEnabledRange.value} days`;

            chartData.push({ barData, fill, labelLink, labelText });
        }
    });

    return chartData;
}

function AgingImagesChart({ searchFilter, timeRanges, timeRangeCounts }: AgingImagesChartProps) {
    const history = useHistory();
    const [widgetContainer, setWidgetContainer] = useState<HTMLDivElement | null>(null);
    const widgetContainerResizeEntry = useResizeObserver(widgetContainer);
    const chartData = makeChartData(searchFilter, timeRanges, timeRangeCounts);

    return (
        <div ref={setWidgetContainer}>
            <Chart
                ariaDesc="Aging images grouped by date of last update"
                ariaTitle="Aging images"
                animate={{ duration: 300 }}
                domainPadding={{ x: [50, 50] }}
                height={defaultChartHeight}
                width={widgetContainerResizeEntry?.contentRect.width} // Victory defaults to 450
                padding={{
                    top: 25,
                    left: 55,
                    right: 10,
                    bottom: 60,
                }}
                theme={patternflySeverityTheme}
            >
                <ChartAxis
                    label="Image age"
                    tickLabelComponent={
                        <LinkableChartLabel
                            linkWith={(props) => labelLinkCallback(props, chartData)}
                            text={(props) => labelTextCallback(props, chartData)}
                        />
                    }
                />
                <ChartAxis
                    label={yAxisTitle(searchFilter)}
                    padding={{ bottom: 10 }}
                    dependentAxis
                    showGrid
                />
                {chartData.map(({ barData, fill }) => {
                    return (
                        <ChartBar
                            key={fill}
                            barWidth={defaultChartBarWidth}
                            data={barData}
                            labels={({ datum }) => `${Math.round(parseInt(datum.y, 10))}`}
                            style={{ data: { fill } }}
                            events={[
                                navigateOnClickEvent(history, (targetProps) => {
                                    const range = targetProps?.datum?.xName;
                                    return linkForAgingImages(searchFilter, range);
                                }),
                            ]}
                        />
                    );
                })}
            </Chart>
        </div>
    );
}

export default AgingImagesChart;
