import React, { useCallback, useState } from 'react';
import { Chart, ChartAxis, ChartBar, ChartLabelProps } from '@patternfly/react-charts';

import useResizeObserver from 'hooks/useResizeObserver';
import {
    defaultChartHeight,
    defaultChartBarWidth,
    patternflySeverityTheme,
    severityColorScale,
} from 'utils/chartUtils';
import { getQueryString } from 'utils/queryStringUtils';
import { LinkableChartLabel } from 'Components/PatternFly/Charts/LinkableChartLabel';
import { SearchFilter } from 'types/search';
import { vulnManagementImagesPath } from 'routePaths';

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

export type TimeRangeCounts = Record<`timeRange${0 | 1 | 2 | 3}`, number>;
export type TimeRangeTuple = [number?, number?, number?, number?];

export type AgingImagesChartProps = {
    searchFilter: SearchFilter;
    selectedTimeRanges: TimeRangeTuple;
    timeRangeCounts: TimeRangeCounts;
};

const labelLinkCallback = ({ datum }: ChartLabelProps, links: string[]) => {
    return typeof datum === 'number' ? links[datum - 1] : '';
};

const labelTextCallback = ({ datum }: ChartLabelProps, text: string[]) => {
    return typeof datum === 'number' ? text[datum - 1] : '';
};

function AgingImagesChart({
    searchFilter,
    selectedTimeRanges,
    timeRangeCounts,
}: AgingImagesChartProps) {
    const [widgetContainer, setWidgetContainer] = useState<HTMLDivElement | null>(null);
    const widgetContainerResizeEntry = useResizeObserver(widgetContainer);

    const data: {
        x: string;
        y: number;
    }[] = [];
    const fillColors: string[] = [];
    const labelLinks: string[] = [];
    const labelText: string[] = [];

    selectedTimeRanges.forEach((range, index) => {
        if (typeof range !== 'undefined') {
            data.push({
                x: String(range),
                y: timeRangeCounts[`timeRange${index}`],
            });
            fillColors.push(severityColorScale[index]);
            labelLinks.push(linkForAgingImages(searchFilter, range));
            labelText.push(`>${range ?? 0} days`);
        }
    });

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
                    top: 10,
                    left: 60,
                    right: 10,
                    bottom: 60,
                }}
                theme={patternflySeverityTheme}
            >
                <ChartAxis
                    label="Image age"
                    tickLabelComponent={
                        <LinkableChartLabel
                            linkWith={(props) => labelLinkCallback(props, labelLinks)}
                            text={(props) => labelTextCallback(props, labelText)}
                        />
                    }
                />
                <ChartAxis label="Active (TODO) images" dependentAxis showGrid />
                {data.map((barData, index) => {
                    const fill = fillColors[index];
                    return (
                        <ChartBar
                            key={fill}
                            barWidth={defaultChartBarWidth}
                            data={[barData]}
                            style={{ data: { fill } }}
                        />
                    );
                })}
            </Chart>
        </div>
    );
}

export default AgingImagesChart;
