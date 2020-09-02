import { Metadata, Properties } from "./data";

const positionMap: { [key: string]: string } = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "Bot",
    UTILITY: "Support",
    OTHER: "Other"
};

const rankInfo = {
    unranked: {
        text: "Unranked/Provisional",
        icon: 29
    },
    bronze: {
        text: "Bronze",
        icon: 3806
    },
    silver: {
        text: "Silver",
        icon: 3807
    },
    gold: {
        text: "Gold",
        icon: 3808
    },
    platinum: {
        text: "Platinum",
        icon: 3809
    },
    diamond: {
        text: "Diamond",
        icon: 3810
    },
    master: {
        text: "Master",
        icon: 3811
    },
    challenger: {
        text: "Challenger",
        icon: 3812
    }
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