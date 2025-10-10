export interface TunnelsTaskProps {
    dataJson: any; // The complete data.json from MOLE
    database: string;
    id: string;
    hash: string;
    structureName: string;
}

export interface TunnelData {
    Type: string;
    Id: string;
    Fingerprint?: string;
    Cavity?: string;
    Properties: {
        Charge?: number;
        Hydrophobicity?: number;
        Hydropathy?: number;
        Polarity?: number;
        Mutability?: number;
        [key: string]: any;
    };
    Profile: ProfilePoint[];
}

export interface ProfilePoint {
    Radius: number;
    FreeRadius?: number;
    BRadius?: number;
    T?: number;
    Distance: number;
    X: number;
    Y: number;
    Z: number;
    Charge?: number;
    Hydrophobicity?: number;
    Hydropathy?: number;
    Polarity?: number;
    Mutability?: number;
}

export interface ChannelsData {
    Tunnels?: TunnelData[];
    [key: string]: any;
}
