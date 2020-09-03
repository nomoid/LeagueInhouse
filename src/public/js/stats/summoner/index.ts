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
    });
});