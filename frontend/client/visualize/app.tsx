import React from "react";
import { createRoot } from "react-dom/client";

import { DockingTask } from "./docking/main";
import { DockingTaskProps } from "./docking/types";

type Visualization<T> = {
    type: string;
    data: T;
};

export function render<T>(visualization: Visualization<T>) {
    const container = document.getElementById("content");
    const pocketListRoot = createRoot(container!);
    pocketListRoot.render(<MainVis type={visualization.type} data={visualization.data} />);
}

function MainVis<T>({ type, data }: Visualization<T>) {
    switch (type) {
        case "docking":
            return <DockingTask {...(data as DockingTaskProps)} />;
        default:
            return (
                <div>
                    <h3>Unknown visualization type</h3>
                    <pre>{JSON.stringify({ type, data })}</pre>
                </div>
            );
    }
}