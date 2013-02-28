/**
 * This jQuery dependent library offers a few text animation utilities. it also relies on jQuery.transit.
 * for a demo visit mm-brian.appspot.com/blog
 * Developed by Mohsen Mansouryar (aka mmbrian)
 * Contact me via mohsen.brian@gmail.com
 */
(function($){

    // riddle's global variables. default values must remain unchanged.
    var animation_started = false;
    var symbol_detected = false;
    var symbol_index = -1;
    var paragraph_details = [];
    var curr_paragraph = 0;
    var totalVisibleChars = 0;

    var riddle_options = {
        // Display Settings
        displaySpeed: 500, // display speed of each character
        displayRange: 5, // number of characters to be displayed during each interval
        paragraphDelay: 500, // delay time before starting each paragraph

        // Hiding Settings
        fastHide: false, // if true, hiding animation shall be skipped
        hidingPoints: 7, // number of points to start hiding from
        hidingPointOffset: 20, // number of characters from start and the end of each paragraph that are skipped
        hidingDelay: 50, // delay time before a new character begins to fade out.
        hidingSpeed: 500, // hiding speed of each character
        hidingCheckInterval: 1000, // the interval for checking if all characters have become hidden

        // Other Settings
        initialDelay: 1500, // delay time before everything begins
        trigger : '', // id of the element that triggers the animation
        extras : [] // list of ids of extra elements that require to be hidden during animation
    }

    /**
     * This method tags every paragraph inside a div and every character inside those paragraphs.
     * paragraph tags are p0, p1, p2, ...
     * character tags are Pc0, Pc1, Pc2, ... where P is the parent paragraph tag.
     * @param divClass class name of a div containing paragraphs that need to be displayed with fading animation
     */
    indentifyParagraphs = function (divClass) {
        var paragraphs = $('.' + divClass + ' p');
        var ret = new Array(paragraphs.length + 1); // number of paragraphs + number of characters inside each paragraph
        ret[0] = paragraphs.length;

        for (var i = 0; i < paragraphs.length; i++) {
            var paragraph = $(paragraphs[i]);
            var pid = 'p' + i;
            paragraph.addClass(pid);

            var text = paragraph.text();
            ret[i+1] = text.length;

            var new_text = "";
            for (var j=0; j<text.length; j++) {
                new_text += '<span class = "' + pid + 'c' + j + '">' + text[j] + '</span>';
            }
            paragraph.html(new_text);
        }

        return ret;
    }

    hideAllCharacters = function () {
        if (riddle_options.fastHide) {
            for (var i=0; i<paragraph_details[0]; i++) {
                $('.p' + i).children().removeClass('visible').addClass('hidden');
            }
        } else {
            hideParagraphsFromRandomHidingPoints();
        }
    }

    HidingPoint = function(paragraph, midCharInd, leftCharInd, rightCharInd) {
        this._p = paragraph;
        this._mid = midCharInd;
        this._left = leftCharInd;
        this._right = rightCharInd;

        this.startHiding = startHiding;
        function startHiding(startDelay) {
            if (startDelay == null) startDelay = 0;

            for (var r=0; r<= this._right - this._mid; r++) {
                (function(r, _p, _mid) {
                    setTimeout(
                        function() {
                            $('.p' + _p + 'c' + (_mid + r)).transition(
                                { opacity: 0 },
                                riddle_options.hidingSpeed,
                                function() {
                                    $(this).removeAttr('style').removeClass('visible').addClass('hidden');
                                    totalVisibleChars--;
                                }
                            );
                        },
                        r * riddle_options.hidingDelay + startDelay);
                })(r, this._p, this._mid);
            }

            for (var l=1; l<=this._mid - this._left; l++) {
                (function(l, _p, _mid) {
                    setTimeout(
                        function() {
                            $('.p' + _p + 'c' + (_mid - l)).transition(
                                { opacity: 0 },
                                riddle_options.hidingSpeed,
                                function() {
                                    $(this).removeAttr('style').removeClass('visible').addClass('hidden');
                                    totalVisibleChars--;
                                }
                            );
                        },
                        l * riddle_options.hidingDelay + startDelay);
                })(l, this._p, this._mid);
            }
        }
    }

    hideParagraphsFromRandomHidingPoints = function () {
        var np = paragraph_details[0]; // number of paragraphs
        if (riddle_options.hidingPoints < np)
            riddle_options.hidingPoints = np; // N => np

        var totalChars = 0;
        for (var i=0; i<np; i++)
            totalChars += paragraph_details[i+1];

        totalVisibleChars = totalChars;

        var HPs = []; // Hiding Points
        var nhp = 0; // Number of Hiding Points

        for (var i=0; i<np; i++) {
            Ni = Math.max(1, Math.ceil((paragraph_details[i+1] / totalChars) * riddle_options.hidingPoints));
            // Ni ~ Pi && Ni => 1

            var points = [];
            var range = Math.floor(paragraph_details[i+1] / Ni);
            if (Ni == 1) {
                points[0] = riddle_options.hidingPointOffset + Math.floor(Math.random() * (range - 2 * riddle_options.hidingPointOffset));
            } else {
                points[0] = riddle_options.hidingPointOffset + Math.floor(Math.random() * (range - riddle_options.hidingPointOffset));
                for (var j=1; j<Ni-1; j++)
                    points[j] = j * range + Math.floor(Math.random() * range);
                points[Ni-1] = (Ni - 1) * range + Math.floor(Math.random() * (range - riddle_options.hidingPointOffset));
            }
            points.sort(function(a,b){return a-b});

            var l = 0, r = paragraph_details[i+1] - 1, mid = 0;
            if (points.length == 1) {
                HPs[nhp++] = new HidingPoint(i, points[0], l, r);
            } else {
                mid = points[0] + Math.floor((points[1] - points[0])/2);
                if (points.length == 2) {
                    HPs[nhp++] = new HidingPoint(i, points[0], l, mid);
                    HPs[nhp++] = new HidingPoint(i, points[1], mid + 1, r);
                } else {
                    HPs[nhp++] = new HidingPoint(i, points[0], l, mid);
                    for (var z=1; z<points.length - 1; z++) {
                        l = mid + 1;
                        r = points[z] + Math.floor((points[z+1] - points[z])/2);
                        HPs[nhp++] = new HidingPoint(i, points[z], l, r);
                        mid = r;
                    }
                    HPs[nhp++] = new HidingPoint(i, points[points.length - 1], mid + 1, paragraph_details[i+1] - 1);
                }
            }
        }

        var c = 0, tmp = null;
        for (var i = HPs.length-1; i>0; i--) { // Shuffling HPs
            c = Math.floor(Math.random() * i);
            tmp = HPs[c];
            HPs[c] = HPs[i];
            HPs[i] = tmp;
        }

        for (var i=0; i<HPs.length; i++)
            HPs[i].startHiding();

        var intervalId = setInterval(
            function() {
                if (totalVisibleChars < 5) {
                    clearInterval(intervalId);
                    displayCharactersFromParagraphBeginning();
                }
            },
            riddle_options.hidingCheckInterval
        );
    }

    displaySingleCharacter = function (charInd, isSymbol) {
        $('.p' + curr_paragraph + 'c' + charInd).transition(
            { opacity: 1 },
            riddle_options.displaySpeed,
            function() {
                $(this).removeAttr('style').removeClass('hidden').addClass('visible');
                if (!symbol_detected){
                    var nextCharInd = charInd + riddle_options.displayRange;
                    if (nextCharInd < paragraph_details[curr_paragraph + 1]) { // next character is in the same paragraph
                        var nextChar = $('.p' + curr_paragraph + 'c' + nextCharInd).text();
                        if (nextChar == "," || nextChar == ".") {
                            symbol_detected = true;
                            symbol_index = nextCharInd;
                            displaySingleCharacter(nextCharInd, true);
                        } else {
                            displaySingleCharacter(nextCharInd, false);
                        }
                    } else {
                        if (nextCharInd % paragraph_details[curr_paragraph + 1] == riddle_options.displayRange - 1) {
                            // Last character from a paragraph is displayed
                            if (++curr_paragraph < paragraph_details[0]) { // next paragraph exists
                                displayCharactersFromParagraphBeginning();
                            } else { // end of animation
                                endAnimation();
                            }
                        }
                    }
                }
                if (isSymbol) {
                    symbol_detected = false;
                    symbol_index = -1;
                    displayCharactersFromIndex(charInd);
                }
            }
        );
    }

    displayCharactersFromIndex = function (ind, startDelay) {
        if (startDelay == null) startDelay = 0;
        var delay = Math.floor(riddle_options.displaySpeed / riddle_options.displayRange);

        for (var i = 0; i < riddle_options.displayRange; i++) {
            if (i + ind < paragraph_details[curr_paragraph + 1]) {
                (function(index) {
                    setTimeout(
                        function() {
                            displaySingleCharacter(index + ind, false);
                        },
                        index * delay + startDelay
                    );
                })(i);
            }
        }
    }

    displayCharactersFromParagraphBeginning = function () {
        displayCharactersFromIndex(0, riddle_options.paragraphDelay);
    }

    endAnimation = function () {
        animation_started = false;

        var multiplier = 1;
        riddle_options.extras.forEach(function(id) {
            $('#' + id).transition(
                { opacity: 1 },
                riddle_options.paragraphDelay * multiplier++,
                function() {
                    $(this).removeAttr('style').removeClass('hidden').addClass('visible');
                }
            );
        });
    }

    startAnimation = function () {
        riddle_options.extras.forEach(function(id) {
            $('#' + id).removeClass('visible').addClass('hidden');
        });
        hideAllCharacters();

        symbol_detected = false;
        symbol_index = -1;
        curr_paragraph = 0;
        if (riddle_options.fastHide)
            displayCharactersFromParagraphBeginning();
        // else, this method would be called automatically after we detect hiding callback
    }

    // this method will permanently modify the target div
    init = function(targetDiv) {
        paragraph_details = indentifyParagraphs(targetDiv);
    }

    setAnimationTriggerOnElementClick = function (elementId) {
        $('#' + elementId).click(
            function () {
                if (!animation_started) {
                    animation_started = true;
                    setTimeout(startAnimation, riddle_options.initialDelay);
                }
            }
        );
    }

    $.fn.riddle = function(options) {
        if(options) {
            $.extend(riddle_options, options );
        }
        $("<style type='text/css'> .visible{opacity: 1;} .hidden{opacity: 0;} </style>").appendTo("head");

        return this.each(function() {
            init($(this).attr("id"));
            setAnimationTriggerOnElementClick(riddle_options.trigger);
        });
    };

})(jQuery);
