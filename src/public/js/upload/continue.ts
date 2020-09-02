declare class Sortable {
    toArray(): string[];
}

function isRedRadioSelected() {
    const redRadio = $("#draft-red-radio").get()[0] as HTMLInputElement;
    return redRadio.checked;
}

function isSideFirst(side: "blue" | "red") {
    return isRedRadioSelected() === (side === "red");
}

function indexNum(first: boolean, num: number) {
    if (num === 0) {
        return 0;
    }
    else if (first) {
        return Math.floor((num + 2) / 2);
    }
    else {
        return Math.floor((num + 1) / 2);
    }
}

function updateSortable(sortable: Sortable, side: "blue" | "red") {
    const order = sortable.toArray();
    const resultElem = $("#draft-result-" + side).get()[0] as HTMLInputElement;
    resultElem.value = JSON.stringify(order);
    const first = isSideFirst(side);

    for (let i = 0; i < order.length; i++) {
        const elem = $("#draft-" + order[i]).get()[0];
        const remainder = indexNum(first, i) % 4;
        if (remainder === 0) {
            elem.style.background = "#ffffff";
        }
        else if (remainder === 1) {
            elem.style.background = "#dddddd";
        }
        else if (remainder == 2) {
            elem.style.background = "#bbbbbb";
        }
        else {
            elem.style.background = "#dddddd";
        }
    }
}

onLoad.push(() => {
    // Get player data
    const playerDataDiv = $("#draft-player-data").get()[0] as HTMLDivElement;
    const playerData = JSON.parse(playerDataDiv.innerHTML);
    for (const color of ["blue", "red"]) {
        populateList(5, i => {
            const singlePlayerData = playerData[color][i];
            return {
                textDiv: `#draft-${color}${i + 1}-name`,
                imgDiv: `#draft-${color}${i + 1}-champion`,
                text: singlePlayerData.summonerName,
                champion: singlePlayerData.champion
            }
        });
    }
    const blueSortable = $("#draft-blue-sortable").sortable({
        onEnd: function (this: Sortable, event) {
            updateSortable(this, "blue");
        }
    }).sortable('widget');
    const redSortable = $("#draft-red-sortable").sortable({
        onEnd: function (this: Sortable, event) {
            updateSortable(this, "red");
        }
    }).sortable('widget');
    const blueRadio = $("#draft-blue-radio").get()[0] as HTMLInputElement;
    const redRadio = $("#draft-red-radio").get()[0] as HTMLInputElement;
    function updateSortables() {
        updateSortable(blueSortable, "blue");
        updateSortable(redSortable, "red");
        // Disable sortable
        // const toDisable = !blueRadio.checked && !redRadio.checked;
        // blueSortable.option("disabled", toDisable);
        // redSortable.option("disabled", toDisable);
    }
    updateSortables();
    blueRadio.onclick = updateSortables;
    redRadio.onclick = updateSortables;
    blueRadio.checked = true;
    // Ignore compiler
    eval("checkDraft(document.getElementById(\"draftSelection\").value)");
});