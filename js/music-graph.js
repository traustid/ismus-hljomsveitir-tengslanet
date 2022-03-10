function MusicGraph(element, apiUrl, options) {
	this.apiUrl = apiUrl;
	this.options = options;
	this.textSprites = [];

	if (this.options.useVR) {
		this.graph = ForceGraphVR({})(element);
	}
	else if (this.options.useCanvas) {
		this.graph = ForceGraph({})(element);
	}
	else {
		var rendererConfig = {
			precision: 'lowp'
		};

		if (this.options.disableAlpha) {
			rendererConfig.alpha = true;
			rendererConfig.premultipliedAlpha = true;
		}
		if (this.options.disableAntialias) {
			rendererConfig.antialias = true;
		}

		console.log(rendererConfig);

		this.graph = ForceGraph3D({
			rendererConfig: rendererConfig
		})(element).dagMode('radialout');
	}

	this.roundRect = function(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}

    this.makeTextSprite = function(str, parameters) {
		var sprite = new THREE.SpriteText(str, {
			font: 'Arial',
			bold: true,
			fontColor: parameters && parameters.textColor ? parameters.textColor : 'rgba(255, 255, 255, 0.85)',
			textHeight: 2.5,
			center: new THREE.Vector2(0.5, 0.5)
		});

		return sprite;
    };

	this.fetchData = function(limit, params, onFetchComplete) {
		this.params = params || null;

		var url = this.apiUrl;

		var urlParams = [];

		if (limit) {
			urlParams.push('limit='+limit)
		}

		if (params) {
			if (params.search) {
				urlParams.push('search='+params.search);
				if (params.limit) {
					urlParams.push('limit='+params.limit);
				}
				if (params.extended) {
					urlParams.push('extended=true');
				}
			}
			else if (params.from && params.to && params.from != params.to) {
				urlParams.push('method=allpaths');
				urlParams.push('from='+params.from);
				urlParams.push('to='+params.to);
			}
		}

		fetch(url+(urlParams.length > 0 ? '?'+urlParams.join('&') : ''))
			.then(function(response) {
				return response.json();
			}.bind(this))
			.then(function(json) {
				this.currentData = json;
				json.links = json.connections;

				json.nodes.forEach(function(node) {
					node.name = node.properties.name;
					node.type = node.label;

					return node;
				});

				this.graph.cooldownTicks(300)
					.cooldownTime(30000)

					.backgroundColor('#ffffff')
					//.backgroundColor('#d6eb6a')

					.nodeAutoColorBy('mark')
					.nodeRelSize(3)

					//.linkAutoColorBy('sameiginlegir_felagar')
					.linkColor(this.options.linkColor || null)

					.forceEngine(this.options.forceEngine || 'ngraph')

					.graphData(json)

					.nodeThreeObject(function(node) {
						var textSpriteParams = {
							fontsize: 18
						}

						if (this.options.textColor) {
							textSpriteParams.textColor = this.options.textColor;
						}

						if (this.params && this.params.from && this.params.to) {
							if (node.name == this.params.from || node.name == this.params.to) {
								textSpriteParams.textColor = this.options.selectedTextColor || '#ff7000';
								textSpriteParams.textSize = 7;
							}
						}
						else if (this.params && this.params.search) {
							if (node.name == this.params.search) {
								textSpriteParams.textColor = this.options.selectedTextColor || '#ff7000';
								textSpriteParams.textSize = 7;
							}
						}

						if (node.type == 'Group') {
							textSpriteParams.textColor = 'rgba(40, 40, 40, 1)';
							//textSpriteParams.textColor = 'rgba(195, 108, 44, 1)';
						}
						else {
							textSpriteParams.textColor = 'rgba(120, 120, 120, 0.9)';
							//textSpriteParams.textColor = 'rgba(44, 124, 195, 1)';
						}

						let textSprite = this.makeTextSprite(node.name, textSpriteParams);
						this.textSprites.push(textSprite);

						return textSprite;
					}.bind(this))
					.onNodeClick(node => {
						console.log(node)
					});

					if (!this.options.useCanvas) {
						this.graph.linkResolution(3);
					}

				this.graph.cameraPosition({
					x: 0,
					y: 0,
					z: this.options.cameraDistance || 300
				});

				if (this.onFetchComplete) {
					this.onFetchComplete();
				}

				if (onFetchComplete) {
					onFetchComplete();
				}
			}.bind(this));
	};

	this.startAutoFlight = function(flightSpeed, options) {
		if (!this.flightInterval) {
			this.flightInterval = setInterval(function() {
				this.flyToRandomNode(flightSpeed, options);
			}.bind(this), flightSpeed ? flightSpeed+(options.pauseInterval || 5000) : 10000);

			this.flyToRandomNode(flightSpeed, options);
		}
	}

	this.flyToRandomNode = function(flightSpeed, options) {
		var randomNode = this.getRandomNode(options && options.minConnections ? options.minConnections : undefined);

		this.flyToNode(randomNode, flightSpeed || 15000, options && options.distance ? options.distance : undefined);

		var nodes = this.getConnectedNodes(randomNode);
		nodes.push(randomNode);

		setTimeout(function() {
			if (options && options.highlightNode) {
				this.highlightNodes(nodes);
			}

			if (options && options.highlightConnections) {
				this.highlightConnections(this.getConnectionsTo(randomNode));
			}
		}.bind(this), flightSpeed/2);
	}

	this.stopAutoFlight = function() {
		if (this.flightInterval) {
			clearInterval(this.flightInterval);

			delete this.flightInterval;
		}
	}

	this.startRotation = function() {
		var angle = 0;
		var distance = 1000;

		if (!this.rotationInterval) {
			this.rotationInterval = setInterval(function() {
				this.graph.cameraPosition({
					x: distance * Math.sin(angle),
					z: distance * Math.cos(angle)
				});

				angle += Math.PI / 300;
			}.bind(this), 100);
		}
	}

	this.stopRotation = function() {
		if (this.rotationInterval) {
			clearInterval(this.rotationInterval);

			delete this.rotationInterval;
		}
	}

	this.findNode = function(id) {
		var node = this.graph.graphData().nodes.filter(function(n) {
			return n.id == id;
		});

		return node ? node[0] : undefined;
	}

	this.findNodeByName = function(name) {
		var node = this.graph.graphData().nodes.filter(function(n) {
			return n.name.toLowerCase() == name.toLowerCase();
		});

		return node ? node[0] : undefined;
	}

	this.getRandomNode = function(minConnections) {
		if (minConnections) {
			var nodes = this.graph.graphData().nodes.filter(function(node) {
				return this.getConnectionsTo(node).length > minConnections;
			}.bind(this));

			return nodes[Math.floor(Math.random()*nodes.length)];
		}
		else {
			return this.graph.graphData().nodes[Math.floor(Math.random()*this.graph.graphData().nodes.length)];
		}
	}

	this.highlightNodes = function(nodes) {
		if (this.highlightedNodes && this.highlightedNodes.length > 0) {
			this.highlightedNodes.forEach(function(node) {
				node.__threeObj.material.color = {
					r: 1,
					g: 1,
					b: 1
				};
			});
		}

		this.highlightedNodes = nodes;

		this.highlightedNodes.forEach(function(node) {
			var highlightedColor = {
				r: 0.4,
				g: 0.6,
				b: 1
			};

			node.__threeObj.material.color = highlightedColor;
		});
	}

	this.highlightConnections = function(connections) {
		if (this.highlightedConnections && this.highlightedConnections.length > 0) {
			this.highlightedConnections.forEach(function(connection) {
/*
				connection.__lineObj.material.color = {
					r: 0.94,
					g: 0.94,
					b: 0.94
				};
*/
				connection.__lineObj.material.opacity = 0.2;
			});
		}
		this.highlightedConnections = connections;

		this.highlightedConnections.forEach(function(connection) {
			var clonedMaterial = connection.__lineObj.material.clone();
/*
			clonedMaterial.color = {
				r: 1,
				g: 0.4,
				b: 0
			};
*/
			clonedMaterial.opacity = 0.8;

			connection.__lineObj.material = clonedMaterial;
		});
	}

	this.getConnectionsTo = function(node) {
		return this.graph.graphData().connections.filter(function(connection) {
			return connection.source == node.id || connection.target == node.id;
		});
	}

	this.getConnectedNodes = function(node) {
		var connected = [];

		this.graph.graphData().connections.forEach(function(connection) {
			if (connection.source == node.id || connection.target == node.id) {
				if (connection.source != node.id) {
					connected.push(this.findNode(connection.source));
				}
				if (connection.target != node.id) {
					connected.push(this.findNode(connection.target));
				}
			}
		}.bind(this));

		return _.uniq(connected, function(node) {
			return node.id;
		})
	}

	this.flyToNode = function(node, flightSpeed, distance) {
		if (!node) {
			return;
		}

		var animate = function(time) {
			var id = requestAnimationFrame(animate);

			var result = TWEEN.update(time);

			if (!result) {
				cancelAnimationFrame(id);
			}
		}

		var cameraPosition = this.graph.cameraPosition();

		var position = {
			x: cameraPosition.x,
			y: cameraPosition.y,
			z: cameraPosition.z
		};

		var nodePosition = node.__threeObj.position;

		var distance = distance || 80;
		var distRatio = 1 + distance/Math.hypot(nodePosition.x, nodePosition.y, nodePosition.z);

		var target = {
			x: nodePosition.x*distRatio,
			y: nodePosition.y*distRatio,
			z: Math.round(Math.random()*8) == 0 ? 1400 : nodePosition.z*distRatio
		};

		var tween = new TWEEN.Tween(position).to(target, flightSpeed || 3000).easing(TWEEN.Easing.Cubic.InOut);

		tween.onUpdate(function() {
			this.graph.cameraPosition({
				x: position.x,
				y: position.y,
				z: position.z
			});
		}.bind(this));

		tween.start();

		animate();
	}
}
