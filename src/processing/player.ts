import { Metadata, Properties } from "./data";

const positionMap: { [key: string]: string } = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "Bot",
    UTILITY: "Support",
    OTHER: "Other"
};

export const rankInfo = {
    unranked: {
        text: "Unranked/Provisional",
        icon: 29
    },
    iron: {
        text: "Iron",
        // no iron icon
        icon: 29
    },
    bronze: {
        text: "Bronze",
        icon: 1395
    },
    silver: {
        text: "Silver",
        icon: 1398
    },
    gold: {
        text: "Gold",
        icon: 1401
    },
    platinum: {
        text: "Platinum",
        icon: 1404
    },
    diamond: {
        text: "Diamond",
        icon: 1407
    },
    master: {
        text: "Master",
        icon: 1410
    },
    grandmaster: {
        text: "Grandmaster",
        // no grandmaster icon
        icon: 1413
    },
    challenger: {
        text: "Challenger",
        icon: 1416
    }
};

export const divisions: [[keyof typeof rankInfo, number], number][] = [
    [["challenger", 0], 1],
    [["grandmaster", 0], 0.9996],
    [["master", 0], 0.99925],
    [["diamond", 1], 0.9975],
    [["diamond", 2], 0.995],
    [["diamond", 3], 0.99],
    [["diamond", 4], 0.975],
    [["platinum", 1], 0.96],
    [["platinum", 2], 0.945],
    [["platinum", 3], 0.925],
    [["platinum", 4], 0.87],
    [["gold", 1], 0.84],
    [["gold", 2], 0.79],
    [["gold", 3], 0.72],
    [["gold", 4], 0.60],
    [["silver", 1], 0.54],
    [["silver", 2], 0.45],
    [["silver", 3], 0.37],
    [["silver", 4], 0.26],
    [["bronze", 1], 0.19],
    [["bronze", 2], 0.13],
    [["bronze", 3], 0.09],
    [["bronze", 4], 0.05],
    [["iron", 1], 0.03],
    [["iron", 2], 0.02],
    [["iron", 3], 0.01],
    [["iron", 4], 0]
];

export interface Player {
    summonerName: string;
    champion: string;
    kills: number;
    assists: number;
    deaths: number;
    position: string;
    win: boolean;
    // false for red team
    blueTeam: boolean;
    visionScore: number;
    doubleKills: number;
    tripleKills: number;
    quadraKills: number;
    pentaKills: number;
    cs: number;
    totalDamageToChampions: number;
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
        blueTeam: get(props, "TEAM") === "100",
        visionScore: parseInt(get(props, "VISION_SCORE")),
        doubleKills: parseInt(get(props, "DOUBLE_KILLS")),
        tripleKills: parseInt(get(props, "TRIPLE_KILLS")),
        quadraKills: parseInt(get(props, "QUADRA_KILLS")),
        pentaKills: parseInt(get(props, "PENTA_KILLS")),
        cs: parseInt(get(props, "MINIONS_KILLED")) + parseInt(get(props, "NEUTRAL_MINIONS_KILLED")),
        totalDamageToChampions: parseInt(get(props, "TOTAL_DAMAGE_DEALT_TO_CHAMPIONS"))
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
    return summonerName.replace(/ /g, "").toLowerCase();
}

export function extractPlayerBySummonerName(metadata: Metadata, summonerName: string): Player | undefined {
    const players = extractAllPlayers(metadata);
    for (const team of [players.blue, players.red]) {
        for (const player of team) {
            if (canonicalSummonerName(player.summonerName) === canonicalSummonerName(summonerName)) {
                return player;
            }
        }
    }
}

export function extractTeamFromPlayer(metadata: Metadata, player: Player) {
    const players = extractAllPlayers(metadata);
    if (player.blueTeam) {
        return players.blue;
    }
    else {
        return players.red;
    }
}

export function getRankInfo(name: string) {
    if (name in rankInfo) {
        return rankInfo[name as keyof typeof rankInfo];
    }
    else {
        return rankInfo.unranked;
    }
}