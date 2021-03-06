
/////////////////////////////// ACL User Interface


// See https://www.coshx.com/blog/2014/04/11/preventing-drag-and-drop-disasters-with-a-chrome-userscript/
// Without this dropping anything onto a browser page will cause chrome etc to jump to diff page
// throwing away all the user's work.

tabulator.panes.utils.preventBrowserDropEvents = function(document) {

    console.log('preventBrowserDropEvents called.')
    if (tabulator.preventBrowserDropEventsDone) return;
    tabulator.preventBrowserDropEventsDone = true;

    function preventDrag(e) {
      e.stopPropagation();
      e.preventDefault();
      // console.log("@@@@ document-level drag suppressed: " + e.dataTransfer.dropEffect)
    }

    function handleDrop(e) {
      if (e.dataTransfer.files.length > 0) {
        if (!confirm("Are you sure you want to drop this file here? "
                    +"(Cancel opens it in a new tab)")) {
          e.stopPropagation();
          e.preventDefault();
          console.log("@@@@ document-level DROP suppressed: " + e.dataTransfer.dropEffect)

          var file = e.dataTransfer.files[0];
          var reader = new FileReader();

          reader.onload = function(event) {
            window.open(reader.result);
          }
          reader.readAsDataURL(file);
        }
      }
    }
    document.addEventListener('drop', handleDrop, false);
    document.addEventListener('dragenter', preventDrag, false);
    document.addEventListener('dragover', preventDrag, false);
}


tabulator.panes.utils.personTR = function(dom, pred, obj, options) {
  var tr = dom.createElement('tr');
  options = options || {}
  tr.predObj = [pred.uri, obj.uri];
  var td1 = tr.appendChild(dom.createElement('td'));
  var td2 = tr.appendChild(dom.createElement('td'));
  var td3 = tr.appendChild(dom.createElement('td'));

  var agent = obj;
  var image = td1.appendChild(dom.createElement('img'));
  image.setAttribute('style', 'width: 3em; height: 3em; margin: 0.1em; border-radius: 1em;')
  tabulator.panes.utils.setImage(image, agent);
  tabulator.panes.utils.setName(td2, agent);
  if (options.deleteFunction){
    tabulator.panes.utils.deleteButtonWithCheck(dom, td3, 'person', options.deleteFunction);
  }
  if (options.link !== false) {
    var anchor = td3.appendChild(dom.createElement('a'))
    anchor.setAttribute('href', obj.uri);
    anchor.classList.add('HoverControlHide')
    var linkImage = anchor.appendChild(dom.createElement('img'));
    linkImage.setAttribute('src', tabulator.scriptBase + 'icons/go-to-this.png');
    td3.appendChild(dom.createElement('br'))
  }
  if (options.draggable !== false){ // default is on
    tr.setAttribute('draggable','true'); // allow a person to be dragged to diff role

    tr.addEventListener('dragstart', function(e){
        tr.style.fontWeight = 'bold';
        // e.dataTransfer.dropEffect = 'move';
        // e.dataTransfer.effectAllowed = 'all'  // same as default
        e.dataTransfer.setData("text/uri-list", obj.uri);
        e.dataTransfer.setData("text/plain", obj.uri);
        e.dataTransfer.setData("text/html", tr.outerHTML);
        console.log("Dragstart: " + tr + " -> " + obj + "de: "+ e.dataTransfer.dropEffect)
    }, false);

    tr.addEventListener('drag', function(e){
        e.preventDefault();
        e.stopPropagation();
        //e.dataTransfer.dropEffect = 'copy';
        // e.dataTransfer.setData("text/uri-list", obj);
        console.log("Drag: dropEffect: "+ e.dataTransfer.dropEffect)
    }, false);

    // icons/go-to-this.png

    tr.addEventListener('dragend', function(e){
        tr.style.fontWeight = 'normal';
        console.log("Dragend dropeffect: " + e.dataTransfer.dropEffect )
        console.log("Dragend: " + tr + " -> " + obj)
    }, false);
  }
  return tr;
}


tabulator.panes.utils.ACLControlBox = function(subject, dom, noun, callback) {
    var kb = tabulator.kb;
    var updater = new tabulator.rdf.sparqlUpdate(kb);
    var ACL = tabulator.ns.acl;
    var doc = subject.doc(); // The ACL is actually to the doc describing the thing

    var table = dom.createElement('table');
    table.setAttribute('style', 'font-size:120%; margin: 1em; border: 0.1em #ccc ;');
    var headerRow = table.appendChild(dom.createElement('tr'));
    headerRow.textContent = "Sharing for " + noun + " " + tabulator.Util.label(subject);
    headerRow.setAttribute('style', 'min-width: 20em; padding: 1em; font-size: 150%; border-bottom: 0.1em solid red; margin-bottom: 2em;');

    var statusRow = table.appendChild(dom.createElement('tr'));
    var statusBlock = statusRow.appendChild(dom.createElement('div'));
    statusBlock.setAttribute('style', 'padding: 2em;');
    var MainRow = table.appendChild(dom.createElement('tr'));
    var box = MainRow.appendChild(dom.createElement('table'));
    var bottomRow = table.appendChild(dom.createElement('tr'));

    var bigButtonStyle = 'border-radius: 0.3em; background-color: white; border: 0.01em solid #888;'

    var ACLControlEditable = function(box, doc, aclDoc, kb, options) {
        var defaultOrMain = options.doingDefault ? 'default' : 'main'
        options = options || {}
        var ac = tabulator.panes.utils.readACL(doc, aclDoc, kb, options.doingDefaults); // Note kb might not be normal one
        var byCombo;
        box[defaultOrMain] = byCombo = tabulator.panes.utils.ACLbyCombination(ac);
        var kToCombo = function(k){
            var y = [ 'Read', 'Append', 'Write', 'Control'];
            var combo = [];
            for (i=0; i< 4; i++) {
                if (k & (1 << i)) {
                    combo.push('http://www.w3.org/ns/auth/acl#' + y[i])
                }
            }
            combo.sort();
            combo = combo.join('\n')
            return combo;
        };
        var colloquial = {13: "Owners", 5: "Editors", 3: "Posters", 2: "Submitters", 1: "Viewers"};
        var explanation = {
            13: "can read, write, and control sharing.",
            5: "can read and change information",
            3: "can add new information, and read but not change existing information",
            2: "can add new information but not read any",
            1: "can read but not change information"
        };

        var kToColor = {13: 'purple', 5: 'red', 3: 'orange', 2: '#cc0', 1: 'green'};

        var ktToList = function(k){
            var list = "", y = ['Read', 'Append', 'Write', 'Control'];
            for (i=0; i< 4; i++) {
                if (k & (1 << i)) {
                    list+= y[i];
                }
            }
        }

        var removeAgentFromCombos = function(uri) {
            for (var k=0; k < 16; k++) {
                var a = byCombo[kToCombo(k)];
                if (a) {
                    for (var i=0; i<a.length; i++){
                        while (i<a.length && a[i][1] == uri) {
                            a.splice(i, 1)
                        }
                    }
                }
            }
        }

        box.saveBack = function(callback){
          var kb2 = $rdf.graph()
          if (!box.isContainer) {
              tabulator.panes.utils.makeACLGraphbyCombo(kb2, doc, box.mainByCombo, aclDoc, true);
          } else if (box.defaultsDiffer){ // Pair of controls
              tabulator.panes.utils.makeACLGraphbyCombo(kb2, doc, box.mainByCombo, aclDoc, true);
              tabulator.panes.utils.makeACLGraphbyCombo(kb2, doc, box.defByCombo, aclDoc, false, true);
          } else { // Linked controls
              tabulator.panes.utils.makeACLGraphbyCombo(kb2, doc, box.mainByCombo, aclDoc, true, true);
          }
          var updater =  tabulator.updater = tabulator.updater || new tabulator.rdf.sparqlUpdate(kb);
          updater.put(aclDoc, kb2.statementsMatching(undefined, undefined, undefined, aclDoc),
              'text/turtle', function(uri, ok, message){
              if (!ok) {
                console.log("ACL file save failed: " + message)
              } else {
                  kb.fetcher.unload(aclDoc);
                  kb.add(kb2.statements);
                  kb.fetcher.requested[aclDoc.uri] = 'done'; // missing: save headers
                  console.log("ACL modification: success!")
              }
              callback(ok);
          });

        }

        var renderCombo = function(byCombo, combo){
            var row = box.appendChild(dom.createElement('tr'));
            row.combo = combo;
            row.setAttribute('style', 'color: '
                + (kToColor[k] || 'black') + ';')

            var left = row.appendChild(dom.createElement('td'));

            left.textContent = colloquial[k] || ktToList[k];
            left.setAttribute('style', 'padding-bottom: 2em;')

            var middle = row.appendChild(dom.createElement('td'));
            var middleTable = middle.appendChild(dom.createElement('table'));
            middleTable.style.width = '100%';

            var right = row.appendChild(dom.createElement('td'));
            right.textContent = explanation[k] || "Unusual combination";
            right.setAttribute('style', 'max-width: 30%;')

            var addAgent = function(pred, obj) {
                if (middleTable.NoneTR) {
                    middleTable.removeChild(middleTable.NoneTR);
                    delete middleTable.NoneTR;
                }
                var opt = {
                  deleteFunction: function deletePerson(){
                      var arr =  byCombo[combo];
                      for (var b=0; b < arr.length; b++) {
                          if  (arr[b][0] === pred && arr[b][1] === obj ) {
                              arr.splice(b, 1); // remove from ACL
                              break;
                          }
                      };
                      // @@@ save byCombo back to ACLDoc
                      middleTable.removeChild(tr);
                  }
                }
                var tr = middleTable.appendChild(
                  tabulator.panes.utils.personTR(
                    dom, $rdf.sym(pred), $rdf.sym(obj), opt));
            };




            var syncCombo = function(combo) {
                var arr = byCombo[combo];
                if (arr && arr.length) {
                    var already = middleTable.children;
                    arr.sort();
                    for (var i=0; i<already.length; i++) {
                        already[i].trashme = true;
                    }
                    for (var a=0; a<arr.length; a++) {
                        var found = false;
                        for (var i=0; i<already.length; i++) {
                            if (already[i].predObj  // skip NoneTR
                                && already[i].predObj[0] === arr[a][0]
                                && already[i].predObj[1] === arr[a][1]){
                                found = true;
                                delete already[i].trashme;
                                break;
                            }
                        }
                        if (!found) {
                            addAgent(arr[a][0], arr[a][1]);
                        }
                    }
                    for (var i=already.length-1; i >=0; i--) {
                        if (already[i].trashme){
                            middleTable.removeChild(already[i]);
                        }
                    }
                } else {
                    tabulator.panes.utils.clearElement(middleTable);
                    var tr = middleTable.appendChild(dom.createElement('tr'));
                    tr.textContent = 'None';
                    tr.setAttribute('style', 'padding: 1em;')
                    middleTable.NoneTR = tr;
                }
            }

            syncCombo(combo);
            row.refresh = function(){
                syncCombo(combo);
            }

            if (options.modify){
                // see http://html5demos.com/drag-anything
                row.addEventListener('dragover', function (e) {
                    e.preventDefault(); // Neeed else drop does not work [sic]
                    e.dataTransfer.dropEffect = 'copy';
                    // console.log('dragover event') // millions of them
                });

                row.addEventListener('dragenter', function (e) {
                  console.log('dragenter event dropEffect: ' + e.dataTransfer.dropEffect )
                  this.style.backgroundColor = '#ccc';
                   e.dataTransfer.dropEffect = 'link';
                  console.log('dragenter event dropEffect 2: ' + e.dataTransfer.dropEffect )
                });
                row.addEventListener('dragleave', function (e) {
                    console.log('dragleave event dropEffect: ' + e.dataTransfer.dropEffect )
                    this.style.backgroundColor = 'white';
                });

                row.addEventListener('drop', function (e) {
                    if (e.preventDefault) e.preventDefault(); // stops the browser from redirecting off to the text.
                    console.log("Drop event. dropEffect: " + e.dataTransfer.dropEffect )
                    console.log("Drop event. types: " + (e.dataTransfer.types ? e.dataTransfer.types.join(', ') : 'NOPE') )

                    /** THIS IS THE MAGIC: we read from getData based on the content type - so it grabs the item matching that format **/
                    var uris = null;
                    var text;
                    var thisEle = this;
                    if (e.dataTransfer.types) {
                        for (var t=0; t<e.dataTransfer.types.length; t++){
                            var type = e.dataTransfer.types[t];
                            if (type === 'text/uri-list') {
                                uris = e.dataTransfer.getData(type).split('\n'); // @ ignore those starting with #
                                console.log("Dropped text/uri-list: " + uris)
                            } else if (type === 'text/plain') {
                                text = e.dataTransfer.getData(type);
                            }
                        }
                        if (uris === null && text && text.slice(0,4) === 'http'){
                            uris = text;
                            console.log("Waring: Poor man's drop: using text for URI");// chrome disables text/uri-list??
                        }
                    } else {
                    // ... however, if we're IE, we don't have the .types property, so we'll just get the Text value
                        var uris = [ e.dataTransfer.getData('Text') ];
                        console.log("@@ WARNING non-standrad drop event: " + uris[0]);
                    }
                    console.log("Dropped URI list (2): " + uris);
                    if (uris) {
                        uris.map(function(u){
                            if (!(combo in byCombo)) {
                                byCombo[combo] = [];
                            }
                            // @@@ Find out - person or group? - if group, use agentClass
                            removeAgentFromCombos(u); // Combos are mutually distinct
                            byCombo[combo].push(['agent', u]);
                            console.log('setting access by ' + u + ' to ' + subject)
                            box.saveBack(function(ok){
                              if (ok) {
                                thisEle.style.backgroundColor = 'white'; // restore look to before drag
                                syncPanel();
                              }
                            })
                        })
                    }
                  return false;
                });

            } // if modify
        };
        var syncPanel = function(){
            var kids = box.children;
            for (var i=0; i< kids.length; i++) {
                if (kids[i].refresh) {
                    kids[i].refresh();
                }
            } // @@ later -- need to addd combos not in the box?
        }

        var k, combo, label;
        for (k=15; k>0; k--) {
            combo = kToCombo(k);
            if (( options.modify && colloquial[k]) || byCombo[combo]){
                renderCombo(byCombo, combo);
            } // if
        } // for
        return byCombo
    } // ACLControlEditable

    tabulator.panes.utils.getACLorDefault(doc, function(ok, p2, targetDoc, targetACLDoc, defaultHolder, defaultACLDoc){
        var defa = !p2;
        if (!ok) {
            statusBlock.textContent += "Error reading " + (defa? " default " : "") + "ACL."
                + " status " + targetDoc + ": " + targetACLDoc;
        } else {
            if (defa) {
                var defaults = kb.each(undefined, ACL('defaultForNew'), defaultHolder, defaultACLDoc);
                if (!defaults.length) {
                    statusBlock.textContent += " (No defaults given.)";
                } else {
                    statusBlock.innerHTML = "The sharing for this " + noun + " is the default for folder <a href='" + defaultHolder.uri + "'>" +
                      tabulator.Util.label(defaultHolder) + "</a>.";
                    var kb2 = tabulator.panes.utils.adoptACLDefault(doc, targetACLDoc, defaultHolder, defaultACLDoc)
                    ACLControlEditable(box, doc, targetACLDoc, kb2, {modify: false}); // Add btton to save them as actual
                    box.style = 'color: #777;';

                    var editPlease = bottomRow.appendChild(dom.createElement('button'));
                    editPlease.textContent = "Set specific sharing\nfor this " + noun;
                    editPlease.style = bigButtonStyle;
                    editPlease.addEventListener('click', function(event) {
                        updater.put(targetACLDoc, kb2.statements,
                            'text/turtle', function(uri, ok, message){
                            if (!ok) {
                                statusBlock.textContent += " (Error writing back access control file: "+message+")";
                            } else {
                                statusBlock.textContent = " (Now editing specific access for this " + noun + ")";
                                box.style = 'color: black;';
                                bottomRow.removeChild(editPlease);
                            }
                        });

                    });
                } // defaults.length
            } else { // Not using defaults

                var useDefault;
                var addDefaultButton = function(prospectiveDefaultHolder) {
                    useDefault = bottomRow.appendChild(dom.createElement('button'));
                    useDefault.textContent = "Stop specific sharing for this " + noun
                     + " -- just use default" // + tabulator.Util.label(thisDefaultHolder);
                    if (prospectiveDefaultHolder){
                      useDefault.textContent += " for " + tabulator.Util.label(prospectiveDefaultHolder)
                    }
                    useDefault.style = bigButtonStyle
                    useDefault.addEventListener('click', function(event) {
                        tabulator.fetcher.webOperation('DELETE', targetACLDoc)
                        .then(function(xhr) {
                            statusBlock.textContent = " The sharing for this " + noun + " is now the default.";
                            bottomRow.removeChild(useDefault);
                            box.style = 'color: #777;';
                        })
                        .catch(function(e){
                            statusBlock.textContent += " (Error deleting access control file: "+message+")";
                        });
                    });
                }
                var prospectiveDefaultHolder

                var str = targetDoc.uri.split('#')[0]
                var p = str.slice(0,-1).lastIndexOf('/')
                var q = str.indexOf('//')
                var targetDocDir =  ((q >= 0 && p < q +2 )|| p < 0 ) ? null : str.slice(0, p+1);

                if (targetDocDir) {
                  var prospectiveDefaultHolder
                  tabulator.panes.utils.getACLorDefault($rdf.sym(targetDocDir), function(ok2, p22, targetDoc2, targetACLDoc2, defaultHolder2, defaultACLDoc2){
                    if (ok2) {
                      prospectiveDefaultHolder = p22? targetDoc2 : defaultHolder2;
                    }
                    addDefaultButton($rdf.sym(targetDocDir));
                  })
                } else {
                  addDefaultButton();
                }

                box.addControlForDefaults = function() {
                  box.notice.textContent = "Defaults for things within this folder:"
                  var mergeButton = tabulator.panes.utils.clearElement(box.offer).appendChild(dom.createElement('button'))
                  mergeButton.innerHTML = "<p>Set default for folder contents to<br />just track the sharing for the folder</p>"
                  mergeButton.style = bigButtonStyle;
                  mergeButton.addEventListener('click', function(e){
                      delete box.defaultsDiffer
                      delete box.defByCombo
                      box.saveBack(function(ok){
                        if (ok) {
                          box.removeControlForDefaults()
                        }
                      })
                  }, false)
                  box.defaultsDiffer = true
                  box.defByCombo = ACLControlEditable(box, targetDoc, targetACLDoc, kb, {modify: true, doingDefaults: true});
                }
                box.removeControlForDefaults = function(){
                  statusBlock.textContent = "This is also the default for things in this folder."
                  box.notice.textContent = "Sharing for things within the folder currently tracks sharing for the folder."
                  var splitButton = tabulator.panes.utils.clearElement(box.offer).appendChild(dom.createElement('button'))
                  splitButton.innerHTML = "<p>Set the sharing of folder contets <br />separately from the sharing for the folder</p>"
                  splitButton.style = bigButtonStyle;
                  splitButton.addEventListener('click', function(e){
                      box.addControlForDefaults()
                      statusBlock.textContent = ''
                  })
                  while (box.divider.nextSibling) {
                    box.removeChild(box.divider.nextSibling)
                  }
                  statusBlock.textContent = "This is now also the default for things in this folder."
                }

                box.isContainer = targetDoc.uri.slice(-1) === '/' // Give default for all directories
                // @@ Could also set from classes ldp:Container etc etc
                if (box.isContainer){
                    var ac = tabulator.panes.utils.readACL(targetDoc, targetACLDoc, kb);
                    var acd = tabulator.panes.utils.readACL(targetDoc, targetACLDoc, kb, true);
                    box.defaultsDiffer = !tabulator.panes.utils.sameACL(ac, acd);
                    console.log("Defaults differ ACL: " + box.defaultsDiffer)
                }
                box.mainByCombo = ACLControlEditable(box, targetDoc, targetACLDoc, kb, {modify: true}); // yes can edit
                box.divider = box.appendChild(dom.createElement('tr'))
                box.notice = box.divider.appendChild(dom.createElement('td'))
                box.offer = box.divider.appendChild(dom.createElement('td'))
                box.notice.setAttribute('colspan', '2');

                if (box.defaultsDiffer){
                  box.addControlForDefaults();
                } else {
                  box.removeControlForDefaults();
                }
            } // Not using defaults
        }

    });

    return table

}; // ACLControlBox
