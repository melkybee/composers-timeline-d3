function timeline(domElement) {

    // chart geometry
    var margin = {top: 20, right: 20, bottom: 20, left: 20},
        outerWidth = 960,
        outerHeight = 500,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    // global timeline variables
    var timeline = {},   // The timeline
        data = {},       // Container for the data
        components = [], // All the components of the timeline for redrawing
        barGap = 25,    // Arbitray gap between two consecutive bars
        bars = {},      // Registry for all the bars in the timeline
        barY = 0;       // Y-Position of the next bar

    // Create svg element
    var svg = d3.select(domElement).append("svg")
        .attr("class", "svg")
        .attr("id", "svg")
        .attr("width", outerWidth)
        .attr("height", outerHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top +  ")");

    svg.append("clipPath")
        .attr("id", "chart-area")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var chart = svg.append("g")
            .attr("class", "chart")
            .attr("clip-path", "url(#chart-area)" );

    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("visibility", "visible");

    // data
    timeline.data = function(items) {

        var today = new Date(),
            tracks = [],
            yearMillis = 31622400000,
            instantOffset = 100 * yearMillis;

        data.items = items;

        function showItems(n) {
            var count = 0, n = n || 10;
            console.log("\n");
            items.forEach(function (d) {
                count++;
                if (count > n) { return; }
                console.log(toYear(d.start) + " - " + toYear(d.end) + ": " + d.label);
            })
        }

        function compareAscending(item1, item2) {
            // Every item must have two fields: 'start' and 'end'.
            var result = item1.start - item2.start;
            // earlier first
            if (result < 0) { return -1; }
            if (result > 0) { return 1; }
            // longer first
            result = item2.end - item1.end;
            if (result < 0) { return -1; }
            if (result > 0) { return 1; }
            return 0;
        }

        function compareDescending(item1, item2) {
            // Every item must have two fields: 'start' and 'end'.
            var result = item1.start - item2.start;
            // later first
            if (result < 0) { return 1; }
            if (result > 0) { return -1; }
            // shorter first
            result = item2.end - item1.end;
            if (result < 0) { return 1; }
            if (result > 0) { return -1; }
            return 0;
        }

        function calculateTracks(items, sortOrder, timeOrder) {
            var i, track;

            sortOrder = sortOrder || "descending"; // "ascending", "descending"
            timeOrder = timeOrder || "backward";   // "forward", "backward"

            function sortBackward() {
                // older items end deeper
                items.forEach(function (item) {
                    for (i = 0, track = 0; i < tracks.length; i++, track++) {
                        if (item.end < tracks[i]) { break; }
                    }
                    item.track = track;
                    tracks[track] = item.start;
                });
            }
            function sortForward() {
                // younger items end deeper
                items.forEach(function (item) {
                    for (i = 0, track = 0; i < tracks.length; i++, track++) {
                        if (item.start > tracks[i]) { break; }
                    }
                    item.track = track;
                    tracks[track] = item.end;
                });
            }

            if (sortOrder === "ascending") {
                data.items.sort(compareAscending);
            } else {
                data.items.sort(compareDescending);
            }
            if (timeOrder === "forward") {
                sortForward();
            } else {
                sortBackward();
            }
        }

        // Convert yearStrings into dates
        data.items.forEach(function (item){
            item.start = parseDate(item.start);
            if (item.end == "") {
                item.end = new Date(item.start.getTime() + instantOffset);
                item.instant = true;
            } else {
                item.end = parseDate(item.end);
                item.instant = false;
            }
            // The timeline never reaches into the future.
            // Comment out if dates in the future should be allowed.
            if (item.end > today) { item.end = today};
        });

        // Show real data
        calculateTracks(data.items, "descending", "backward");
        data.nTracks = tracks.length;
        data.minDate = d3.min(data.items, function (d) { return d.start; });
        data.maxDate = d3.max(data.items, function (d) { return d.end; });

        return timeline;
    };

    // bar
    timeline.bar = function (barName, sizeFactor) {

        var bar = {};
        bar.id = "bar";
        bar.x = 0;
        bar.y = barY;
        bar.w = width;
        bar.h = height * (sizeFactor || 1);
        bar.trackOffset = 4;
        // Prevent tracks from getting too high
        bar.trackHeight = Math.min((bar.h - bar.trackOffset) / data.nTracks, 20);
        bar.itemHeight = bar.trackHeight * 0.8,
        bar.instantWidth = 100; // arbitray value

        bar.xScale = d3.time.scale()
            .domain([data.minDate, data.maxDate])
            .range([0, bar.w]);

        bar.yScale = function (track) {
            return bar.trackOffset + track * bar.trackHeight;
        };

        bar.g = chart.append("g")
            .attr("id", bar.id)
            .attr("transform", "translate(0," + bar.y +  ")");

        bar.g.append("rect")
            .attr("class", "bar")
            .attr("width", bar.w)
            .attr("height", bar.h);

        // Items
        var items = bar.g.selectAll("g")
            .data(data.items)
            .enter().append("svg")
            .attr("y", function (d) { return bar.yScale(d.track); })
            .attr("height", bar.itemHeight)
            .attr("class", function (d) { return d.instant ? "part instant" : "part interval";});

        var intervals = d3.select("#bar").selectAll(".interval");
        intervals.append("rect")
            .attr("width", "100%")
            .attr("height", "100%");
        intervals.append("text")
            .attr("class", "intervalLabel")
            .attr("x", 1)
            .attr("y", 10)
            .text(function (d) { return d.label; });

        var instants = d3.select("#bar").selectAll(".instant");
        instants.append("circle")
            .attr("cx", bar.itemHeight / 2)
            .attr("cy", bar.itemHeight / 2)
            .attr("r", 5);
        instants.append("text")
            .attr("class", "instantLabel")
            .attr("x", 15)
            .attr("y", 10)
            .text(function (d) { return d.label; });

        bar.addActions = function(actions) {
            // actions - array: [[trigger, function], ...]
            actions.forEach(function (action) {
                items.on(action[0], action[1]);
            })
        };

        bar.redraw = function () {
            items
                .attr("x", function (d) { return bar.xScale(d.start);})
                .attr("width", function (d) {
                    return bar.xScale(d.end) - bar.xScale(d.start); });
        };

        bars[barName] = bar;
        components.push(bar);
        // Adjust values for next bar
        barY += bar.h + barGap;

        return timeline;
    };

    // labels
    timeline.labels = function (barName) {

        var bar = bars[barName],
            labelWidth = 46,
            labelHeight = 20,
            labelTop = bar.y + bar.h - 10,
            y = bar.y + bar.h + 1,
            yText = 15;

        var labelDefs = [
                ["start", "barMinMaxLabel", 0, 4,
                    function(min, max) { return toYear(min); },
                    "Start of the selected interval", bar.x + 30, labelTop],
                ["end", "barMinMaxLabel", bar.w - labelWidth, bar.w - 4,
                    function(min, max) { return toYear(max); },
                    "End of the selected interval", bar.x + bar.w - 152, labelTop],
                ["middle", "barMidLabel", (bar.w - labelWidth) / 2, bar.w / 2,
                    function(min, max) { return max.getUTCFullYear() - min.getUTCFullYear(); },
                    "Length of the selected interval", bar.x + bar.w / 2 - 75, labelTop]
            ];

        var barLabels = chart.append("g")
            .attr("id", barName + "Labels")
            .attr("transform", "translate(0," + (bar.y + bar.h + 1) +  ")")
            .selectAll("#" + barName + "Labels")
            .data(labelDefs)
            .enter().append("g")
            .on("mouseover", function(d) {
                tooltip.html(d[5])
                    .style("top", d[7] + "px")
                    .style("left", d[6] + "px")
                    .style("visibility", "visible");
                })
            .on("mouseout", function(){
                tooltip.style("visibility", "hidden");
            });

        barLabels.append("rect")
            .attr("class", "barLabel")
            .attr("x", function(d) { return d[2];})
            .attr("width", labelWidth)
            .attr("height", labelHeight)
            .style("opacity", 1);

        var labels = barLabels.append("text")
            .attr("class", function(d) { return d[1];})
            .attr("id", function(d) { return d[0];})
            .attr("x", function(d) { return d[3];})
            .attr("y", yText)
            .attr("text-anchor", function(d) { return d[0];});

        labels.redraw = function () {
            var min = bar.xScale.domain()[0],
                max = bar.xScale.domain()[1];

            labels.text(function (d) { return d[4](min, max); })
        };

        components.push(labels);

        return timeline;
    };

    // tooltips
    timeline.tooltips = function (barName) {

        var bar = bars[barName];

        bar.addActions([
            // trigger, function
            ["mouseover", showTooltip],
            ["mouseout", hideTooltip]
        ]);

        function getHtml(element, d) {
            var html;
            if (element.attr("class") == "interval") {
                html = d.label + "<br>" + toYear(d.start) + " - " + toYear(d.end);
            } else {
                html = d.label + "<br>" + toYear(d.start);
            }
            return html;
        }

        function showTooltip (d) {

            var x = event.pageX < bar.x + bar.w / 2
                    ? event.pageX + 10
                    : event.pageX - 110,
                y = event.pageY < bar.y + bar.h / 2
                    ? event.pageY + 30
                    : event.pageY - 30;

            tooltip
                .html(getHtml(d3.select(this), d))
                .style("top", y + "px")
                .style("left", x + "px")
                .style("visibility", "visible");
        }

        function hideTooltip () {
            tooltip.style("visibility", "hidden");
        }

        return timeline;
    };

    // xAxis
    timeline.xAxis = function (barName, orientation) {

        var bar = bars[barName];

        var axis = d3.svg.axis()
            .scale(bar.xScale)
            .orient(orientation || "bottom")
            .tickSize(6, 0)
            .tickFormat(function (d) { return toYear(d); });

        var xAxis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (bar.y + bar.h)  + ")");

        xAxis.redraw = function () {
            xAxis.call(axis);
        };

        components.push(xAxis); // for timeline.redraw

        return timeline;
    };

    // redraw
    timeline.redraw = function () {
        components.forEach(function (component) {
            component.redraw();
        })
    };

    // Utility functions
    function parseDate(dateString) {
        // Valid AD years: '1', '99', '2015'
        // Valid BC years: '1 BC', '-1', '11 BCE', '10 v.Chr.', '-354'

        var format = d3.time.format("%Y-%m-%d"),
            date,
            year;

        date = format.parse(dateString);
        if (date !== null) { return date; }

        if (isNaN(dateString)) { // Handle BC year
            // Remove non-digits, convert to negative number
            year = -(dateString.replace(/[^0-9]/g, ""));
        } else { // Handle AD year
            // Convert to positive number
            year = +dateString;
        }
        if (year < 0 || year > 99) { // 'Normal' dates
            date = new Date(year, 6, 1);
        } else if (year == 0) { // Year 0 is '1 BC'
            date = new Date (-1, 6, 1);
        } else { // Create arbitrary year and then set the correct year
            // For full years, date is set to mid year (1st of July)
            date = new Date(year, 6, 1);
            date.setUTCFullYear(("0000" + year).slice(-4));
        }
        return date;
    }

    function toYear(date, bcString) {
        // bcString is the prefix or postfix for BC dates.
        // If bcString starts with '-' (minus),
        // it will be placed in front of the year.
        bcString = bcString || " BC"; // with blank
        var year = date.getUTCFullYear();
        if (year > 0) { return year.toString(); }
        if (bcString[0] == '-') { return bcString + (-year); }
        return (-year) + bcString;
    }

    return timeline;
}