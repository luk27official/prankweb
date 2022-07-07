import React from "react";
import { PocketData } from "../types";
import 'css.gg/icons/css/select-o.css';
import 'css.gg/icons/css/eye.css';
import 'css.gg/icons/css/eye-alt.css';
import 'css.gg/icons/css/close.css';
import 'css.gg/icons/css/check.css';
import 'css.gg/icons/css/arrow-down-o.css';
import 'css.gg/icons/css/arrow-up-o.css';


export default class Pocket extends React.Component
  <{
    pocket: PocketData,
    index: number,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void
  }, {}> {

  state = {
    "visible": true
  };

  constructor(props: any) {
    super(props);
    this.onPocketMouseEnter = this.onPocketMouseEnter.bind(this);
    this.onPocketMouseLeave = this.onPocketMouseLeave.bind(this);
    this.onPocketClick = this.onPocketClick.bind(this);
    this.showOnlyClick = this.showOnlyClick.bind(this);
    this.togglePocketVisibility = this.togglePocketVisibility.bind(this);
    this.toggleCardVisibility = this.toggleCardVisibility.bind(this);
  }

  onPocketMouseEnter() {
    if (!this.props.pocket.isReactVisible) {
      return;
    }
    this.props.highlightPocket(this.props.index, true);
  }

  onPocketMouseLeave() {
    if (!this.props.pocket.isReactVisible) {
      return;
    }
    this.props.highlightPocket(this.props.index, false);
  }

  onPocketClick() {
    // Cannot focus on hidden pocket.
    if (!this.props.pocket.isReactVisible) {
      return;
    }
    this.props.focusPocket(this.props.index);
  }

  showOnlyClick() {
    this.props.showOnlyPocket(this.props.index);
  }

  togglePocketVisibility() {
    this.props.setPocketVisibility(this.props.index, !this.props.pocket.isReactVisible);
  }

  toggleCardVisibility() {
    this.setState({"visible": !this.state.visible});
  }

  render() {
    const pocket = this.props.pocket;
    let borderColor = "#" + this.props.pocket.color;
    if(pocket.isReactVisible === undefined) {
      pocket.isReactVisible = true; //TODO: look at this once more
    }
    if (!this.props.pocket.isReactVisible) {
      borderColor = "gray";
    }
    return (
      <div className="card pocket" style={{"borderColor": borderColor}}>
        <div className="card-header text-center" style={{marginBottom: "0.5rem"}}>
          <div className="row">
            <div className="col-8">
          <h4 className="card-title" style={{marginTop: "0.5rem"}}>Pocket {pocket.rank}</h4>
            </div>
            <div className="col-4">
                <button
                  type="button"
                  title="HIDE/SHOW"
                  className="btn btn-outline-secondary"
                  onClick={this.toggleCardVisibility}
                  style={{marginTop: "0.35rem"}}
                >
                {this.state.visible ? <i className="gg-arrow-up-o" style={{fontSize: "1em"}}></i>:<i className="gg-arrow-down-o" style={{fontSize: "1em"}}></i>}
              </button>
            </div>
          </div>
        </div>
        {this.state.visible && <div className="card-body">
          <dl className="pocket-properties">
            <dt>Pocket rank:</dt>
            <dd>{pocket.rank}</dd>
            <dt>Pocket score:</dt>
            <dd>{pocket.score}</dd>
            <dt>Probability score:</dt>
            <dd>{pocket.probability || "N/A"}</dd>
            <dt>AA count:</dt>
            <dd>{pocket.residues.length}</dd>
            <dt>Conservation:</dt>
            <dd>{pocket.avgConservation || "N/A"}</dd>
          </dl>
        </div>
        }
        {this.state.visible && <div className="card-footer">
        <div className="container">
          <div className="row">
            <div className="col-4">
              <button
                type="button"
                title="Show only this pocket"
                className="btn btn-outline-secondary"
                onClick={this.showOnlyClick}
              >
                <i className="gg-eye" style={{fontSize: "0.5em"}}></i>
              </button>
            </div>
            <div className="col-4">
            <button
                type="button"
                style={{
                  "display": this.props.pocket.isReactVisible ? "inherit" : "none",
                }}
                title="Focus/highlight to this pocket."
                className="btn btn-outline-secondary"
                onClick={this.onPocketClick}
                onMouseEnter={this.onPocketMouseEnter}
                onMouseLeave={this.onPocketMouseLeave}
              >
              <i className="gg-select-o"></i>
              </button>
            </div>
            <div className="col-4">
            <button
            type="button"
            title="Show / Hide pocket."
            className="btn btn-outline-secondary"
            onClick={this.togglePocketVisibility}>
            {this.props.pocket.isReactVisible ? <i className="gg-close" style={{fontSize: "1.5em"}}></i>:<i className="gg-check" style={{fontSize: "1.5em"}}></i>}
          </button>
            </div>
          </div>
        </div>
        </div>}
      </div>
    )
  }
}