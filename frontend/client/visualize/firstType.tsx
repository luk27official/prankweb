import React from "react";

import "./app.css";

export interface FirstTypeProps {
    message: string;
}

export function FirstType(fp: FirstTypeProps) {
    return <h3>{fp.message}</h3>;
}