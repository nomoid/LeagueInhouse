import { Metadata, Properties } from "./data";

interface Player {
    summonerName: string;
    champion: string;
    // championsKilled: number;
    // assists: number;
    // numDeaths: number;
    // teamPosition: string;
}

function get(props: Properties, key: string): string {
    const value = props[key];
    if (value === undefined) {
        throw new Error(`${key} is undefined.`);
    }
    return value;
}

function extractPlayer(props: Properties) {
    const player: Player = {
        summonerName: get(props, "NAME"),
        champion: get(props, "SKIN")
    };
    return player;
}

export function extractAllPlayers(metadata: Metadata) {
    const bluePlayers = metadata.bluePlayers.map((player) => {
        return extractPlayer(player);
    });
    const redPlayers = metadata.redPlayers.map((player) => {
        return extractPlayer(player);
    });

    const res = {
        blue: bluePlayers,
        red: redPlayers
    };
    return res;
}