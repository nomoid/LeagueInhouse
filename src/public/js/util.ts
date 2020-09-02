function getVersion(callBack: (data: string) => void) {
    $.getJSON("https://ddragon.leagueoflegends.com/api/versions.json", function (data: string[]) {
        callBack(data[0]);
    });
}

interface PopulateInfo {
    textDiv: string;
    imgDiv: string;
    text: string;
    champion: string;
}


function populateList(count: number, getInfo: (index: number) => PopulateInfo) {
    getVersion(function (version) {
        for (let i = 0; i < count; i++) {
            const populateInfo = getInfo(i)
            const li = $(populateInfo.textDiv).get()[0] as HTMLLIElement;
            const summonerName = $('<div>').text(populateInfo.text).html();
            li.innerHTML = summonerName;
            const domContainer = document.querySelector(populateInfo.imgDiv);
            const e = React.createElement;
            ReactDOM.render(e(Icon, {
                type: "champion",
                name: populateInfo.champion,
                version: version,
                width: 20
            }), domContainer);
        }
    });
}

const onLoad = [() => {}];