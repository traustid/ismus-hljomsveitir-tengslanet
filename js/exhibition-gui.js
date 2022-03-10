//const Graph = ForceGraphVR()(document.getElementById("3d-graph"));

//var neo4jUrl = 'http://130.208.178.119:3010/neo4j?method=allpaths&from=fjara&to=ofsi';
//var neo4jUrl = 'http://130.208.178.119:3010/neo4j?method=path&from=fjara&to=ofsi';
//var neo4jUrl = 'http://130.208.178.119:3010/neo4j?method=search&search=jurt';
//var neo4jUrl = 'http://130.208.178.119:3010/neo4j?method=search&search=frost';

var graphOptions = {
	textColor: window.theme && window.theme == 'light' ? 'rgba(20, 20, 20, 0.85)' : 'rgba(255, 255, 255, 0.85)',
	useCanvas: false
};

if (window.theme && window.theme == 'light') {
	graphOptions.linkColor = 'rgba(255, 255, 255, 0)';
}

if (window.searchMode == 'search') {
	graphOptions.cameraDistance = 450;
	//graphOptions.forceEngine = 'd3';
}

if (window.disableAlpha) {
	graphOptions.disableAlpha = true;
}

if (window.disableAntialias) {
	graphOptions.disableAntialias = true;
}

var graph;
var initGraph = function() {
	graph = new OrdanetGraph(document.getElementById("3d-graph"), 
		'http://nidhoggur.rhi.hi.is/neo4j', 
		graphOptions
	);
};

initGraph();

var alphabet = ['A', 'Á', 'B', 'D', 'E', 'É', 'F', 'G', 'H', 'I', 'Í', 'J', 'K', 'L', 'M', 'N', 'O', 'Ó', 'P', 'R', 'S', 'T', 'U', 'Ú', 'V', 'Y', 'Ý', 'Þ', 'Æ', 'Ö'];

var selectedLeftWord;
var selectedRightWord;
var selectedWord;

var wordList;

var getSearchList = function(startsWith, searchListId) {
	startsWith = startsWith.toLowerCase();

	var searchList = _.filter(wordList, function(item) {
		return item.fletta.substr(0, startsWith.length) == startsWith && item.mark.substr(0, 2).toLowerCase() == 'no';
	});

	if (searchListId == 'searchAreaLeft') {
		selectedLeftWord = searchList[0].fletta;
	}
	if (searchListId == 'searchArea') {
		selectedWord = searchList[0].fletta;
	}
	if (searchListId == 'searchAreaRight') {
		selectedRightWord = searchList[0].fletta;
	}

	if (selectedLeftWord && selectedRightWord && selectedLeftWord != selectedRightWord) {
		graph.fetchData(5000, {
			from: selectedLeftWord,
			to: selectedRightWord
		});
	}
	else if (selectedWord) {
		graph.fetchData(100, {
			search: selectedWord,
			extended: true
		});
	}

	$('#'+searchListId+' .search-word-list').html('');

	_.each(searchList, function(item) {
		$('#'+searchListId+' .search-word-list').append('<a>'+item.fletta+'</a>');
	});

	$('#'+searchListId+' .search-word-list').scrollTop(0);

	$('#'+searchListId+' .search-word-list a:first-child').addClass('highlighted');

	$('#'+searchListId+' .search-word-list a').each(function(linkIndex, link) {
		$(link).click(function() {
			var windowHeight = $(window).height();
			var offsetTop = link.offsetTop;
			var scrollPos = offsetTop-(windowHeight/2)+0;

			//$('#'+searchListId+' .search-word-list')[0].scrollTop = scrollPos;

			$('#'+searchListId+' .search-word-list').animate({
				scrollTop: scrollPos+30
			}, 500);
		});
	});
}

var getFirstLetters = function(startsWith, searchListId) {
	console.log('getFirstLetters: '+startsWith)
	var searchList = _.filter(wordList, function(item) {
		return item.fletta.toLowerCase().substr(0, 1) == startsWith.toLowerCase() && item.mark.substr(0, 2).toLowerCase() == 'no';
	});

	var firstLetters = _.uniq(_.map(searchList, function(item) {
		return item.fletta.substr(0, 2);
	}));

	$('#'+searchListId+' .firstletters-container').html('');

	$('#'+searchListId+' .firstletters-container').append('<a data-letters="'+startsWith.toLowerCase()+'">'+startsWith.toUpperCase()+'...</a>');

	_.each(firstLetters, function(item) {
		$('#'+searchListId+' .firstletters-container').append('<a data-letters="'+item+'">'+(item.charAt(0).toUpperCase() + item.slice(1))+'...</a>');
	});

	$('#'+searchListId+' .firstletters-container a').each(function(linkIndex, letterLink) {
		$(letterLink).click(function() {
			getSearchList(letterLink.dataset.letters, searchListId);
		});
	});
}

$.getJSON('data/ordalisti.json', function(data) {
	wordList = data;

	if (window.searchMode == 'path') {
		var firstLetter = alphabet[Math.floor(Math.random()*alphabet.length)];
		var secondLetter = alphabet[Math.floor(Math.random()*alphabet.length)];

		getFirstLetters(firstLetter, 'searchAreaLeft');
		getFirstLetters(secondLetter, 'searchAreaRight');

		getSearchList(firstLetter, 'searchAreaLeft');
		getSearchList(secondLetter, 'searchAreaRight');
	}
	if (window.searchMode == 'search') {
		var letter = alphabet[Math.floor(Math.random()*alphabet.length)];

		getFirstLetters(letter, 'searchArea');

		getSearchList(letter, 'searchArea');
	}

	var windowHeight = $(window).height();
	var gridTop = windowHeight * 0.45;
	var gridBottom = windowHeight * 0.55;

	var fetching = false;
	var scrolling = false;
	var scrollTimeout;

	$('.search-area').each(function(index, searchArea) {
		alphabet.forEach(function(letter) {
			$(searchArea).find('.alphabet-container').append('<a data-letter="'+letter.toLowerCase()+'">'+letter+'</a>');
		});

		$(searchArea).find('.alphabet-container a').each(function(linkIndex, letterLink) {
			$(letterLink).click(function() {
				getSearchList(letterLink.dataset.letter, $(searchArea).attr('id'));

				getFirstLetters(letterLink.dataset.letter, $(searchArea).attr('id'));
			});
		});

		$(searchArea).find('.search-word-list').on('scroll', function() {
			clearTimeout(scrollTimeout);

			scrolling = true;

			var found = false;

			$(searchArea).find('.search-word-list a').each(function() {
				var thisTop = $(this).offset().top - $(window).scrollTop();
		
				if (thisTop >= gridTop && (thisTop + $(this).height()) <= gridBottom && !found) {
					$(this).addClass('highlighted');

					if ($(searchArea).attr('id') == 'searchAreaLeft') {
						selectedLeftWord = $(this).text();
					}
					if ($(searchArea).attr('id') == 'searchAreaRight') {
						selectedRightWord = $(this).text();
					}
					if ($(searchArea).attr('id') == 'searchArea') {
						selectedWord = $(this).text();
					}

					found = true;
				} else {
					$(this).removeClass('highlighted');
				}
			});

			scrollTimeout = setTimeout(function() {
				scrolling = false;

				if (selectedLeftWord && selectedRightWord && selectedLeftWord != selectedRightWord && !fetching) {
					fetching = true;

					graph.fetchData(5000, {
						from: selectedLeftWord,
						to: selectedRightWord
					}, function() {
						fetching = false;
					});
				}
				else if (selectedWord && !fetching) {
					fetching = true;

					graph.fetchData(100, {
						search: selectedWord,
						extended: true
					}, function() {
						fetching = false;
					});
				}
			}, 500);
		});
	});
});

$(document).ready(function() {
	$(document).on('mousemove mousedown touchstart', function() {
		$(document.body).addClass('touch-overlay-hidden');

		if (window.showInfoTimeout) {
			clearTimeout(window.showInfoTimeout);
		}

		window.showInfoTimeout = setTimeout(function() {
			$(document.body).removeClass('touch-overlay-hidden');
		}, 60000)
	});

	$('#infoButton').click(function() {
		$(document.body).toggleClass('info-overlay-visible');
	});

	$('#infoCloseButton').click(function() {
		$(document.body).removeClass('info-overlay-visible');
	});
});
