import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Chart, ChartAxis, ChartBar } from '@patternfly/react-charts';

import useResizeObserver from 'hooks/useResizeObserver';
import {
    defaultChartHeight,
    defaultChartBarWidth,
    patternflySeverityTheme,
    severityColorScale,
} from 'utils/chartUtils';

export type TimeRangeCounts = Record<`timeRange${0 | 1 | 2 | 3}`, number>;
export type TimeRangeTuple = [number?, number?, number?, number?];

export type AgingImagesChartProps = {
    selectedTimeRanges: TimeRangeTuple;
    timeRangeCounts: TimeRangeCounts;
};

function AgingImagesChart({ selectedTimeRanges, timeRangeCounts }: AgingImagesChartProps) {
    const history = useHistory();
    const [widgetContainer, setWidgetContainer] = useState<HTMLDivElement | null>(null);
    const widgetContainerResizeEntry = useResizeObserver(widgetContainer);

    const data: {
        x: string;
        y: number;
    }[] = [];

    selectedTimeRanges.forEach((range, index) => {
        if (typeof range === 'undefined') {
            // TODO Remove color from theme
        } else {
            data.push({
                x: `>${range} days`,
                y: timeRangeCounts[`timeRange${index}`],
            });
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
                <ChartAxis label="Image age" />
                <ChartAxis label="Active (TODO) images" dependentAxis showGrid />
                {selectedTimeRanges.map((range, index) => {
                    if (typeof selectedTimeRanges[index] !== 'number') {
                        return null;
                    }
                    const fill = severityColorScale[index];
                    return (
                        <ChartBar
                            barWidth={defaultChartBarWidth}
                            data={[data[index]]}
                            style={{ data: { fill } }}
                        />
                    );
                })}
            </Chart>
        </div>
    );
}

export default AgingImagesChart;
