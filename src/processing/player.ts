import { Metadata, Properties } from "./data";

const positionMap: { [key: string]: string } = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "Bot",
    UTILITY: "Support",
    OTHER: "Other"
};

interface Player {
    summonerName: string;
    champion: string;
    kills: number;
    assists: number;
    deaths: number;
    position: string;
    win: boolean;
    // false for red team
    blueTeam: boolean;
}

function get(props: Properties, key: string): string {
    const value = props[key];
    if (value === undefined) {
        throw new Error(`${key} is undefined.`);
    }
    return value;
}

function extractSinglePlayer(props: Properties) {
    const positionRaw = get(props, "TEAM_POSITION");
    let position = positionMap[positionRaw];
    if (position === undefined) {
        position = positionMap["OTHER"];
    }
    const player: Player = {
        summonerName: get(props, "NAME"),
        champion: get(props, "SKIN"),
        kills: parseInt(get(props, "CHAMPIONS_KILLED")),
        assists: parseInt(get(props, "ASSISTS")),
        deaths: parseInt(get(props, "NUM_DEATHS")),
        position: position,
        win: get(props, "WIN") === "Win",
        blueTeam: get(props, "TEAM") === "100"
    };
    return player;
}

export function extractAllPlayers(metadata: Metadata) {
    const bluePlayers = metadata.bluePlayers.map((player) => {
        return extractSinglePlayer(player);
    });
    const redPlayers = metadata.redPlayers.map((player) => {
        return extractSinglePlayer(player);
    });

    const res = {
        blue: bluePlayers,
        red: redPlayers
    };
    return res;
}

function canonicalSummonerName(summonerName: string) {
    return summonerName.replace(" ", "").toLowerCase();
}

export function extractPlayerBySummonerName(metdata: Metadata, summonerName: string): Player | undefined {
    const players = extractAllPlayers(metdata);
    for (const team of [players.blue, players.red]) {
        for (const player of team) {
            if (canonicalSummonerName(player.summonerName) === canonicalSummonerName(summonerName)) {
                return player;
            }
        }
    }
}
