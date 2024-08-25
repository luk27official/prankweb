import { Model, Branch, Hetatm } from "./types";

export default function parsePdbqt(pdbqtContent: string): Model[] {
    const models: Model[] = [];
    let currentModel: Model | null = null;

    const lines = pdbqtContent.split('\n');
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const keyword = parts[0];

        if (currentModel && keyword !== 'MODEL') {
            currentModel.originalContent += line + '\n';
        }

        switch (keyword) {
            case 'MODEL':
                if (currentModel) {
                    models.push(currentModel);
                }
                const modelNumber = parseInt(parts[1]);
                currentModel = {
                    number: modelNumber,
                    vinaResult: [],
                    root: [],
                    branches: [],
                    torsdof: 0,
                    originalContent: line + '\n',
                };
                break;
            case 'REMARK':
                if (parts[1] === 'VINA') {
                    currentModel!.vinaResult = parts.slice(3).map(parseFloat);
                }
                break;
            case 'ROOT':
                break;
            case 'HETATM':
                const hetatm: Hetatm = {
                    id: parseInt(parts[1]),
                    element: parts[2],
                    x: parseFloat(parts[5]),
                    y: parseFloat(parts[6]),
                    z: parseFloat(parts[7]),
                };
                currentModel!.root.push(hetatm);
                break;
            case 'BRANCH':
                const branch: Branch = {
                    start: parseInt(parts[1]),
                    end: parseInt(parts[2]),
                };
                currentModel!.branches.push(branch);
                break;
            case 'TORSDOF':
                currentModel!.torsdof = parseInt(parts[1]);
                break;
            case 'ENDMDL':
                break;
            default:
                break;
        }
    }

    if (currentModel) {
        models.push(currentModel);
    }

    return models;
}