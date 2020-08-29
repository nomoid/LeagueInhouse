const e = React.createElement;

interface ChampionIconProps {
    name: string;
    version: string;
    width?: number;
}

class ChampionIcon extends React.Component<ChampionIconProps> {

    constructor(props: ChampionIconProps) {
        super(props);
    }

    render() {
        return e(
            'img',
            {
                width: this.props.width,
                src: `http://ddragon.leagueoflegends.com/cdn/${this.props.version}/img/champion/${this.props.name}.png`,
                onClick: () =>
                // Add onClick for champ page
                { }
            },
        );
    }
}
