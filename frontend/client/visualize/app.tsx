import React from "react";
import { createRoot } from "react-dom/client";

import "./app.css";

export function render() {
    const container = document.getElementById("content");
    const pocketListRoot = createRoot(container!);
    pocketListRoot.render(<MainVis />);
}

export function MainVis() {
    return (<div>Hi</div>);
}