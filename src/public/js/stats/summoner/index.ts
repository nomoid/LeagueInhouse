onLoad.push(() => {
    // Unsafe cast to add bootstrap tooltip function
    const tooltip = ($("[data-toggle='tooltip']") as any).tooltip();
    getVersion(function (version) {
        const icon = $("#summoner-icon-data").get()[0].innerHTML;
        const domContainer = document.querySelector("#summoner-icon");
        const e = React.createElement;
        ReactDOM.render(e(Icon, {
            type: "profileicon",
            name: icon,
            version: version,
            width: 120
        }), domContainer);
        (() => {
            const iconDataArray = $('div[id^="rank-icon-data').get();
            for (const iconData of iconDataArray) {
                console.log(iconData);
                const iconHTML = iconData.innerHTML;
                const idPrefix = iconHTML.split("=")[0];
                const icon = iconHTML.split("=")[1];
                if (icon !== undefined) {
                    const domContainer = document.querySelector(`#rank-icon-${idPrefix}`);
                    const e = React.createElement;
                    ReactDOM.render(e(Icon, {
                        type: "profileicon",
                        name: icon,
                        version: version,
                        width: 16
                    }), domContainer);
                }
            }
        })();
    });
});