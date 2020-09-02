const e = React.createElement;

const remap: { [key: string]: string } = {
    "FiddleSticks": "Fiddlesticks"
};

interface IconProps {
    type: "champion" | "profileicon";
    name: string;
    version: string;
    width?: number;
}

class Icon extends React.Component<IconProps> {

    constructor(props: IconProps) {
        super(props);
    }

    render() {
        let name = this.props.name;
        if (remap[name]) {
            name = remap[name];
        }
        return e(
            'img',
            {
                width: this.props.width,
                src: `http://ddragon.leagueoflegends.com/cdn/${this.props.version}/img/${this.props.type}/${name}.png`,
                onClick: () =>
                // Add onClick for champ page
                { }
            },
        );
    }
}
