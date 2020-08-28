const e = React.createElement;

interface ChampionIconProps {
    name: string;
    version: string;
}

class ChampionIcon extends React.Component<ChampionIconProps> {

    constructor(props: ChampionIconProps) {
        super(props);
    }

    render() {
        return e(
            'img',
            {
                src: `http://ddragon.leagueoflegends.com/cdn/${this.props.version}/img/champion/${this.props.name}.png`,
                onClick: () =>
                // Add onClick for champ page
                { }
            },
        );
    }
}
