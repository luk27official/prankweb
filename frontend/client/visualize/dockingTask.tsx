import React from "react";

import "./app.css";

export interface DockingTaskProps {
    content: string;
}

export function DockingType(dp: DockingTaskProps) {
    return <pre>{dp.content}</pre>;
}

export async function getDockingTaskContent(type: string, id: string, database: string, hash: string) {
    const response = await fetch(`./api/v2/docking/${database}/${id}/public/out_vina.pdbqt`, {
        method: 'POST',
        headers: {
            'Accept': 'text/plain',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash
        })
    }).then(res => res.text()).catch(err => console.log(err));

    return { content: response };
}