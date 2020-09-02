onLoad.push(() => {
    getVersion(function (version) {
        const domContainer = document.querySelector("#summoner-icon");
        const e = React.createElement;
        ReactDOM.render(e(Icon, {
            type: "profileicon",
            name: "29",
            version: version,
            width: 120
        }), domContainer);
    });
});