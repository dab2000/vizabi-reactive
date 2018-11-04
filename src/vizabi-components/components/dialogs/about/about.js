import * as utils from "base/utils";
import Dialog from "components/dialogs/_dialog";
import globals from "base/globals";
import Tool from "base/tool";

/*
 * Size dialog
 */

const About = Dialog.extend("about", {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "about";

    this._super(config, parent);
  },

  readyOnce() {
    const version = globals.version;
    const updated = new Date(parseInt(globals.build));

    this.element = d3.select(this.element);
    this.element.select(".vzb-about-text0")
      .html("This chart is made with Vizabi,");
    this.element.select(".vzb-about-text1")
      .html("a project by <a href='http://gapminder.org' target='_blank'>Gapminder Foundation</a>");
    this.element.select(".vzb-about-version")
      .html("<a href='https://github.com/Gapminder/vizabi/releases/tag/v" + version + "' target='_blank'>Version: " + version + "</a>");
    this.element.select(".vzb-about-updated")
      .html("Build: " + d3.timeFormat("%Y-%m-%d at %H:%M")(updated));
    this.element.select(".vzb-about-report")
      .html("<a href='https://getsatisfaction.com/gapminder/' target='_blank'>Report a problem</a>");
    this.element.select(".vzb-about-credits")
      .html("<a href='https://github.com/Gapminder/vizabi/graphs/contributors' target='_blank'>Contributors</a>");

    //versions

    const toolData = {};
    const versionInfo = this.root.versionInfo;
    toolData.version = versionInfo ? versionInfo.version : "N/A";
    toolData.build = versionInfo ? d3.timeFormat("%Y-%m-%d at %H:%M")(new Date(parseInt(versionInfo.build))) : "N/A";
    toolData.name = this.root.name;

    const toolsEl = this.element.select(".vzb-about-tool");
    toolsEl.html("");
    toolsEl.append("p")
      .text("Tool: " + toolData.name);
    toolsEl.append("p")
      .text("-version: " + toolData.version);
    toolsEl.append("p")
      .text("-build: " + toolData.build);

    const data = this.model.stores.dataSource.getAll();

    const readerData = data.map(ds => {
      const data = {};
      const versionInfo = ds.reader.versionInfo;
      data.version = versionInfo ? versionInfo.version : "N/A";
      data.build = versionInfo ? d3.timeFormat("%Y-%m-%d at %H:%M")(new Date(parseInt(versionInfo.build))) : "N/A";
      data.name = ds.reader._name;
      return data;
    });

    let readersEl = this.element.select(".vzb-about-readers").selectAll(".vzb-about-reader").data(readerData);
    readersEl.exit().remove();
    readersEl = readersEl.enter()
      .append("p")
      .attr("class", "vzb-about-reader");
    readersEl.append("p")
      .text(d => d.name);
    readersEl.append("p")
      .text(d => "-version: " + d.version);
    readersEl.append("p")
      .text(d => "-build: " + d.build);

    const datasetData = data.map(ds => ds.datasetName);

    let datasetsEl = this.element.select(".vzb-about-datasets").selectAll(".vzb-about-dataset").data(datasetData);
    datasetsEl.exit().remove();
    datasetsEl = datasetsEl.enter()
      .append("p")
      .attr("class", "vzb-about-dataset");
    datasetsEl.append("p")
      .text(d => d);

  }
});

export default About;
