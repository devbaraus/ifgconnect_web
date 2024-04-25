import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import * as d3 from 'd3';

export interface Node extends SimulationNodeDatum {
	id: string;
	group: number;
	color: string;
	tooltip?: string;
	actions?: {
		click?: () => void;
	};
}

export interface Link extends SimulationLinkDatum<Node> {
	id: string;
	source: string;
	target: string;
}

export type GraphParams = {
	data: {
		nodes: Node[];
		links: Link[];
	};
};

export function graph(el: HTMLDivElement, { data }: GraphParams) {
	// Specify the dimensions of the chart.
	const width = el.clientWidth;
	const height = el.clientHeight;

	const nodeSize = 9;

	// The force simulation mutates links and nodes, so create a copy
	// so that re-evaluating this cell produces the same result.
	const links = data.links;
	const nodes = data.nodes;

	// Create a simulation with several forces.
	const simulation = d3
		.forceSimulation(nodes)
		.force(
			'link',
			d3.forceLink(links).id((d) => d.id)
		)
		.force('charge', d3.forceManyBody().strength(-120))
		.force('center', d3.forceCenter())
		.force('x', d3.forceX())
		.force('y', d3.forceY());

	// Create the SVG container.
	const svg = d3
		.create('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', [-width / 2, -height / 2, width, height])
		.attr('style', 'max-width: 100%; height: auto; position: relative;');

	const uuid = () =>
		Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

	const tooltip = d3
		.create('div')
		.append('div')
		.attr('id', uuid)
		.attr(
			'style',
			'position: absolute; display: block; border-style: solid; white-space: nowrap; z-index: 9999999; box-shadow: rgba(0, 0, 0, 0.2) 1px 2px 10px; transition: opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s, visibility 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s, transform 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s; background-color: rgb(255, 255, 255); border-width: 1px; border-radius: 4px; color: rgb(102, 102, 102); font: 14px / 21px sans-serif; padding: 10px; border-color: rgb(255, 255, 255); pointer-events: none;'
		)
		.style('top', 0)
		.style('left', 0)
		.style('opacity', 0)
		.style('visibility', 'hidden');

	// Add a line for each link, and a circle for each node.
	const link = svg
		.append('g')
		.attr('stroke', '#999')
		.attr('stroke-opacity', 0.6)
		.selectAll('line')
		.data(links)
		.join('line');

	const node = svg
		.append('g')
		.attr('stroke', '#fff')
		.attr('stroke-width', 1.5)
		.selectAll('circle')
		.data(nodes)
		.join('circle')
		.attr('r', nodeSize)
		.attr('fill', (d) => {
			return d.color ?? '#000';
		})
		.text((d) => d.id); // Add text inside the node

	function getRelativeMousePosition(event: MouseEvent) {
		const rect = svg.node().getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	node
		.on('click', function (event, d) {
			if (d.actions?.click) {
				d.actions.click();
			}
		})
		.on('mouseover', function (event, d) {
			const { x, y } = getRelativeMousePosition(event);

			tooltip.style('top', `${y + nodeSize}px`).style('left', `${x + nodeSize}px`);
			tooltip.style('opacity', 1).style('visibility', 'visible');
			tooltip.selectAll('*').remove();
			tooltip.append('div').html(d.tooltip ?? 'no tooltip');
		})
		.on('mousemove', function (event, d) {
			const { x, y } = getRelativeMousePosition(event);

			tooltip.style('top', `${y + nodeSize}px`).style('left', `${x + nodeSize}px`);
			tooltip.style('opacity', 1).style('visibility', 'visible');
		})
		.on('mouseout', function (event, d) {
			tooltip.style('opacity', 0).style('visibility', 'hidden');
		});

	// Add a drag behavior.
	node.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

	// Set the position attributes of links and nodes each time the simulation ticks.
	simulation.on('tick', () => {
		link
			.attr('x1', (d) => d.source.x)
			.attr('y1', (d) => d.source.y)
			.attr('x2', (d) => d.target.x)
			.attr('y2', (d) => d.target.y);

		node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
	});

	// Reheat the simulation when drag starts, and fix the subject position.
	function dragstarted(event: d3.D3DragEvent<SVGCircleElement, any, any>) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}

	// Update the subject (dragged node) position during drag.
	function dragged(event: d3.D3DragEvent<SVGCircleElement, any, any>) {
		event.subject.fx = event.x;
		event.subject.fy = event.y;
	}

	// Restore the target alpha so the simulation cools after dragging ends.
	// Unfix the subject position now that it’s no longer being dragged.
	function dragended(event: d3.D3DragEvent<SVGCircleElement, any, any>) {
		if (!event.active) simulation.alphaTarget(0);
		event.subject.fx = null;
		event.subject.fy = null;
	}

	// When this cell is re-run, stop the previous simulation. (This doesn’t
	// really matter since the target alpha is zero and the simulation will
	// stop naturally, but it’s a good practice.)
	// invalidation.then(() => simulation.stop());
	el.style.position = 'relative';
	el.appendChild(svg.node());
	el.appendChild(tooltip.node());

	return {
		destroy() {
			simulation.stop();
		}
	};
}