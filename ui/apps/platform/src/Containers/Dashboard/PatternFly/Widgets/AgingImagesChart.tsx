import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Chart, ChartAxis, ChartBar } from '@patternfly/react-charts';

import useResizeObserver from 'hooks/useResizeObserver';
import {
    defaultChartHeight,
    defaultChartBarWidth,
    patternflySeverityTheme,
} from 'utils/chartUtils';

export type AgingImagesChartProps = {
    timeRangeCounts: Record<string, number>;
};

function AgingImagesChart({ timeRangeCounts }: AgingImagesChartProps) {
    const history = useHistory();
    const [widgetContainer, setWidgetContainer] = useState<HTMLDivElement | null>(null);
    const widgetContainerResizeEntry = useResizeObserver(widgetContainer);

    return (
        <div ref={setWidgetContainer}>
            <Chart
                ariaDesc="Aging images grouped by date of last update"
                ariaTitle="Aging images"
                animate={{ duration: 300 }}
                domainPadding={{ x: [40, 40] }}
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
                <ChartAxis label="Active (TODO) images" dependentAxis />
                <ChartBar
                    barWidth={defaultChartBarWidth}
                    data={[
                        { x: '>30 days', y: 20 },
                        { x: '>60 days', y: 30 },
                    ]}
                />
            </Chart>
        </div>
    );
}

export default AgingImagesChart;
