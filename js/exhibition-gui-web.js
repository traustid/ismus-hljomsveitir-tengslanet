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

var alphabet = ['A', 'Á', 'B', 'D', 'E', 'É', 'F', 'G', 'H', 'I', 'Í', 'J', 'K', 'L', 'M', 'N', 'O', 'Ó', 'P', 'R', 'S', 'T', 'U', 'Ú', 'V', 'Y', 'Ý', 'Þ', 'Æ', 'Ö'];

var graph = new OrdanetGraph(document.getElementById("3d-graph"), 
	'http://nidhoggur.rhi.hi.is/neo4j', 
	graphOptions
);

graph.onFetchComplete = function() {

};

var selectedLeftWord;
var selectedRightWord;
var selectedWord;

var wordList;

var getSearchList = function(searchListId) {

	console.log('getSearchList')
	var searchList = _.filter(wordList, function(item) {
		return item.mark.substr(0, 2).toLowerCase() == 'no';
	});

	searchList = searchList.slice(0, 100);

	if (searchListId == 'searchAreaLeft') {
		selectedLeftWord = wordList[Math.floor(Math.random()*wordList.length)].fletta;
		$('#'+searchListId+' .selected-word').text(selectedLeftWord);
	}
	if (searchListId == 'searchAreaRight') {
		selectedRightWord = wordList[Math.floor(Math.random()*wordList.length)].fletta;
		$('#'+searchListId+' .selected-word').text(selectedRightWord);
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

	var updateSearchList = function(filteredList) {
		$('#'+searchListId+' .search-word-list').html('');

		_.each(filteredList, function(item) {
			$('#'+searchListId+' .search-word-list').append('<a>'+item.fletta+'</a>');
		});

		$('#'+searchListId+' .search-word-list').scrollTop(0);

		$('#'+searchListId+' .search-word-list a').each(function(linkIndex, link) {
			$(link).click(function() {
				$('#'+searchListId+' .selected-word').text($(link).text());
				if (searchListId == 'searchAreaLeft') {
					selectedLeftWord = $(link).text();
				}
				if (searchListId == 'searchAreaRight') {
					selectedRightWord = $(link).text();
				}

				if (selectedLeftWord && selectedRightWord && selectedLeftWord != selectedRightWord) {
					console.log(selectedLeftWord)
					console.log(selectedRightWord)
					graph.fetchData(5000, {
						from: selectedLeftWord,
						to: selectedRightWord
					});
				}

				//$('#'+searchListId+' input').val($(link).text());
			});
		});
	};

	updateSearchList(searchList);

	$('#'+searchListId+' input').on('keyup', function(event) {
		var inputValue = $('#'+searchListId+' input').val()

		var filteredList = inputValue.length > 0 ? _.filter(wordList, function(item) {
			return item.fletta.substr(0, inputValue.length) == inputValue && item.mark.substr(0, 2).toLowerCase() == 'no';
		}) : searchList;

		console.log(filteredList)

		updateSearchList(filteredList);
	});
}

$.getJSON('data/ordalisti.json', function(data) {
	wordList = data;

	if (window.searchMode == 'path') {
		getSearchList('searchAreaLeft');
		getSearchList('searchAreaRight');
	}

	var windowHeight = $(window).height();
	var gridTop = windowHeight * 0.45;
	var gridBottom = windowHeight * 0.55;

	var fetching = false;
	var scrolling = false;
	var scrollTimeout;

	$('.search-area').each(function(index, searchArea) {
	});
});

