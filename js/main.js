//youtube test app object
const ytta = {};
//youtube api creditial
ytta.key = "ADD YOUR API KEY HERE";
//initialize youtube client api for search
function init() {
  gapi.client.setApiKey(ytta.key);
  return (
    gapi.client
      .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(
        function() {
          console.log("GAPI client loaded for API");
        },
        function(err) {
          console.error("Error loading GAPI client for API", err);
        }
      )
      .then(getInitialPlaylist),
    function(err) {
      console.error("Error loading initial playlist", err);
    }
  );
}
//load initial playlist data
function getInitialPlaylist() {
  const playlistId = "PLXh3BIl0lLJd017yaDqMLY5zTZpO-2GgP";
  const initialPlaylistURL =
    "https://www.googleapis.com/youtube/v3/playlistItems";
  //set options for Playlist API call
  const options = {
    part: "snippet",
    key: ytta.key,
    playlistId: playlistId,
    maxResults: 5
  };
  return gapi.client.youtube.playlistItems
    .list(options)
    .then(handleInitialPlaylist, function(err) {
      console.error("Execute error", err);
    });
}
//handle initial playlist - load first video, get details, and create playlist
function handleInitialPlaylist(response) {
  const id = response.result.items[0].snippet.resourceId.videoId;
  const title = response.result.items[0].snippet.title;
  const desc = response.result.items[0].snippet.description;
  playerVideo(id);
  videoDetails(id);
  playlist(response.result);
}

//add event listener to search form and submit search to API
$(document).ready(function() {
  //Return search results from YouTube API when search is submitted
  $("#search").submit(function(event) {
    event.preventDefault();
    //get query value
    let query = $(this)[0][0].value.trim();
    query = query.replace(/%20/g, "+");
    //clear input field
    $("#search__input").val("");
    //set options for Search API call
    const options = {
      part: "snippet",
      key: ytta.key,
      q: query,
      order: "relevance",
      maxResults: 5
    };
    return gapi.client.youtube.search
      .list(options)
      .then(handleSearchResponse, function(err) {
        console.error("Execute error", err);
      });
  });
});
//handle search results and load video, description, and new playlist
function handleSearchResponse(response) {
  // Handle the results here (response.result has the parsed body).
  const id = response.result.items[0].id.videoId;
  const title = response.result.items[0].snippet.title;
  const desc = response.result.items[0].snippet.description;
  playerVideo(id, title);
  videoDetails(id);
  playlist(response.result);
}
//Set current video in player and add to DOM
function playerVideo(id, title) {
  $("#player").html(`
    <iframe title=${title}
    src="https://www.youtube.com/embed/${id}" 
    frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
    </iframe>
    `);
}
//Set current video details and add to DOM
function videoDetails(id) {
  let options = {
    part: "snippet, statistics",
    id: id
  };
  return gapi.client.youtube.videos.list(options).then(
    function(response) {
      let stats = response.result.items[0].statistics;
      let desc = response.result.items[0].snippet.description;
      let title = response.result.items[0].snippet.title;
      //place statistics in statistics div
      $("#statistics").html(`
        <p>${stats.viewCount} views <i class="fas fa-thumbs-up"></i> 
        ${stats.likeCount} <i class="fas fa-thumbs-down"></i> 
        ${stats.dislikeCount}</p>
        `);
      //parse description string for wrapURLs()
      const parser = new DOMParser();
      desc = parser.parseFromString(desc, "text/html").body.innerHTML;
      desc = wrapURLs(desc, true);
      //place description in description div
      $("#desc").html(`
        <h2>${title}</h2>
        <p id='textarea' class="shortText">${desc}</p>
        <p id='toggleText'>show more</p>
        `);
      //call toggleDesc to default text area of description to partial visibility
      toggleDesc();
    },
    function(err) {
      console.error("Execute error", err);
    }
  );
}
//Toggle textarea of description
ytta.shortText = true;
function toggleDesc() {
  $("#toggleText").on("click", function() {
    console.log(ytta.shortText);
    if (ytta.shortText === false) {
      $("#textarea")
        .removeClass("longText")
        .addClass("shortText");
      $(this).text("show more");
      ytta.shortText = true;
    } else if (ytta.shortText === true) {
      $("#textarea")
        .removeClass("shortText")
        .addClass("longText");
      $(this).text("show less");
      ytta.shortText = false;
    }
  });
}

//Fill playlist
function playlist(data) {
  if (data.kind === "youtube#playlistItemListResponse") {
    $.each(data.items, function(i, item) {
      const thumb = item.snippet.thumbnails.medium.url;
      const title = item.snippet.title.substring(0, 60) + "...";
      const desc = item.snippet.description;
      const id = item.snippet.resourceId.videoId;
      let active =
        i == 0
          ? "class='moreVids active' style=background-color:red"
          : "class=moreVids";
      $("#playlist").append(`
            <article ${active} data-key="${id}">
                <img src="${thumb}" alt="${title}"class="thumb"/>
                <h3>${title}</h3>
            </article>
            `);
    });
  } else {
    $("#playlist").html("");
    $.each(data.items, function(i, item) {
      const thumb = item.snippet.thumbnails.medium.url;
      const title = item.snippet.title.substring(0, 40) + "...";
      const desc = item.snippet.description;
      const id = item.id.videoId;
      let active =
        i == 0
          ? "class='moreVids active' style=background-color:red"
          : "class=moreVids";
      $("#playlist").append(`
            <article ${active} data-key="${id}">
                <img src="${thumb}" alt="${title}"class="thumb"/>
                <h3>${title}</h3>
            </article>
            `);
    });
  }
}
//Change video in player when thumbnail is clicked
$("#playlist").on("click", "article", function() {
  const selected = $(this);
  const id = selected.attr("data-key");
  $(".active")
    .css("background-color", "#282828")
    .removeClass("active");
  selected.css("background-color", "red").addClass("active");
  playerVideo(id);
  videoDetails(id);
});
//change video in player when controls are clicked
$("#controls").on("click", "div", function() {
  let current = $(".active");
  let id = "";
  if (this.id === "next") {
    //
    let next =
      current.attr("data-key") ===
      $(".moreVids")
        .last()
        .attr("data-key")
        ? $(".moreVids").first()
        : current.next(".moreVids");
    current.css("background-color", "#282828").removeClass("active");
    next.css("background-color", "red").addClass("active");
    id = next.attr("data-key");
  } else {
    let prev =
      current.attr("data-key") ===
      $(".moreVids")
        .first()
        .attr("data-key")
        ? $(".moreVids").last()
        : current.prev(".moreVids");
    current.css("background-color", "#282828").removeClass("active");
    prev.css("background-color", "red").addClass("active");
    id = prev.attr("data-key");
  }
  playerVideo(id);
  videoDetails(id);
});
//set custom search input validation message
$(function() {
  $("input[name=search_input]")[0].oninvalid = function() {
    this.setCustomValidity("Sorry, can't search for blank space");
  };
});
$(function() {
  $("input[name=search_input]")[0].oninput = function() {
    this.setCustomValidity("");
  };
});
//github.com/ryansmith94/wrapURLs.js for formatting description string
function wrapURLs(text, new_window) {
  var url_pattern = /(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\x{00a1}\-\x{ffff}0-9]+-?)*[a-z\x{00a1}\-\x{ffff}0-9]+)(?:\.(?:[a-z\x{00a1}\-\x{ffff}0-9]+-?)*[a-z\x{00a1}\-\x{ffff}0-9]+)*(?:\.(?:[a-z\x{00a1}\-\x{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/gi;
  var target = new_window === true || new_window == null ? "_blank" : "";

  return text.replace(url_pattern, function(url) {
    var protocol_pattern = /^(?:(?:https?|ftp):\/\/)/i;
    var href = protocol_pattern.test(url) ? url : "http://" + url;
    return (
      '<a href="' +
      href +
      '" target="' +
      target +
      'rel="noreferrer"' +
      '">' +
      url +
      "</a>" +
      "</br>"
    );
  });
}
