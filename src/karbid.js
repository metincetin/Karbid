var karbid = {
    renderFile: function(url,element){
      karbid.utils.ajax.get(url,function(data){
        karbid.render(data,element);
      });
    },
    elements:{},
    binder:function(){
        this.duration = 50;
        this.bindings = [];
        this.interval = setInterval(function(){
            for(this.i = 0;i<karbid.binder.bindings.length;this.i++){
                this.binding = karbid.binder.bindings[i];

                if(this.binding.attr.includes(".")){
                    if (this.binding.attr.split(".")[0] == "style"){
                        if(this.binding.element.style[this.binding.attr.split(".")[1]] != eval(this.binding.value))
                            this.binding.element.style[this.binding.attr.split(".")[1]] = eval(this.binding.value);
                    }
                }else{
                    if(this.binding.element[this.binding.attr] != eval(this.binding.value))
                    this.binding.element[this.binding.attr] = eval(this.binding.value);
                }



            }
        },200)
    },
    render: function(code,curelem){
        var lines = code.split("\n");
        var inElements = [];
        var curElement={};

        var pass = false;
        evalScript = false;
        evalScriptCode = "";

        if (curelem!=undefined){
            inElements.push({element:curelem,parent:{},elements:[],inLoop: false,queryElement:{}});
            curElement = inElements[0];
        }
        elementsCount = 100;
        var attribute = {name:"",value:""}
        var curAttribute="";
        var attrValue="";

        var curEvent="";
        var eventCode="";

        var bracketCount = 0;
        var inLoop = false;
        var loop = {};

        var binding = false;


        var conditions = [{condition:true}];
        var conditionIndex=0;

        if (inElements.length == 0){
            inElements.push({element:document.body,parent:{},elements:[],inLoop: false,html:"",queryElement:{}});
            curElement = inElements[0];
        }
        for (var a=0;a<lines.length;a++){
            var line = lines[a].trim();
            //conditionals
            if (conditions[conditions.length-1].condition == false){
                if(line.startsWith("endif")){
                    conditions[conditions.length-1].condition = true;
                }else{
                    continue;
                }
            }


            if (pass){
                continue;
            }

            if(evalScript == true){
                if(line.endsWith("endscript") == false)
                evalScriptCode += line;

            }

            if (line.startsWith("include")){
                if(line.split(" ").length>1){
                    karbid.utils.ajax.get(line.split(" ")[1],function(data){
                        karbid.render(data);
                    });
                }
            }

            //webrequest
            if(line.startsWith("request")){
                var args = line.split("request ")[1].split(" ");
                var argsObj={};
                if(args.length<3){
                    console.error("Not enough arguments for request. Expected 3 got "+args.length);
                }else{
                    if(args[0].toLowerCase() =="post" || args[0].toLowerCase() =="get"){
                        argsObj.method=args[0].toUpperCase();
                    }
                    argsObj.url = args[1];
                    if (argsObj.url.startsWith("(")){
                        argsObj.url = replaceAt(argsObj.url,argsObj.url.length-1,"");
                        argsObj.url = replaceAt(argsObj.url,0,"");

                        argsObj.url = eval(args[1]);
                    }
                    argsObj.variable = args[2];


                    var xmlHttp = new XMLHttpRequest();
                    xmlHttp.onreadystatechange = function() {
                        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                            window[argsObj.variable]=xmlHttp.responseText;
                    }
                    xmlHttp.open(argsObj.method, argsObj.url, false);
                    xmlHttp.send(null);
                }
            }

            //binding
            if (line.startsWith("!")){
                if(curAttribute == "" && curEvent == ""){
                    binding = true;
                    line = karbid.utils.replaceAt(line,0,""); //removing the !
                }
            }


            if(line[0]=="@" && curAttribute == "" &&curEvent == ""){
                //this is an element
                line = line.replace("@","");
                if(line.endsWith("{")){
                    line=karbid.utils.replaceAt(line,line.length-1,"");
                }
                if (line.endsWith(":{")) {
                    line = karbid.utils.replaceAt(line, line.length - 1, "");
                    line = karbid.utils.replaceAt(line, line.length - 1, "");
                }



                var element = karbid.utils.queryConverter(line);
                if(element.tag=="" || element.tag ==""){
                    element.tag="div";
                }
                if(element.id == ""){
                    element.id = "elem_"+elementsCount;
                }


                //loop
                if(curElement.inLoop == false && element.loop!=undefined){
                    //a loop that hasn't started yet
                    curElement.loop = {};
                    curElement.loop = element.loop;
                    curElement.loop.startingLine = a;
                    curElement.loop.index = 0;
                    curElement.loop.to=element.loop.to-1;
                    curElement.loop.name = element.loop.name;
                    curElement.inLoop = true;
                    curElement.loop.type = element.loop.type;
                    if(element.loop.array.length>0){
                        curElement.element[element.loop.name]=element.loop.array[curElement.loop.index];
                    }else{
                        curElement.element[element.loop.name] = curElement.loop.index;
                    }
                }
                if(curElement.inLoop){
                    if(element.loop.type == "foreach"){
                        curElement.element[element.loop.name] = element.loop.array[curElement.loop.index];
                    }else{
                        curElement.element[element.loop.name] = curElement.loop.index;
                    }
                }


                //create the element
                htmlElement = document.createElement(element.tag);

                if(curElement.inLoop){
                    //htmlElement.setAttribute(element.loop.name,curElement.element[element.loop.name]);
                    htmlElement[element.loop.name] = curElement.element[element.loop.name];
                }

                //if parent is in loop, we assign its value to this
                if (curElement.parent.loop != undefined || curElement.parent.parentInLoop){
                        curElement.parent.parentInLoop=true;
                        curElement.loop = curElement.parent.loop
                        htmlElement[curElement.parent.loop.name] = curElement.parent.element[curElement.parent.loop.name]
                }

                htmlElement.addEventListener("init",function(){
                    if(curElement.html != ""){
                        var text = document.createElement("text");
                        text.innerHTML = eval(curElement.html);
                        this.insertBefore(text,this.childNodes[curElement.htmlBefore]);
                    }
                });
                curElement.element.appendChild(htmlElement);


                var objectElement = {element:htmlElement,parent:curElement,elements:[],inLoop:false,html:""};
                curElement.elements.push(objectElement);

                curElement = objectElement;
                curElement.queryElement = element;

                elementsCount++;

                karbid.elements[element.id]=htmlElement;

                htmlElement.id = element.id;

                if (element.class != ""){
                    htmlElement.className = element.class.replace("."," ");
                }
                if (element.tag == "body"){
                    htmlElement=document.body;
                }


            }



            //end of the code
            if(line.endsWith("}") && bracketCount == 0){
                if(curAttribute == "" && curEvent == ""){
                    curElement.element.dispatchEvent(init);
                    var le = curElement;
                    curElement = curElement.parent;
                    if(curElement.inLoop == true){
                        if(curElement.loop.endingLine==undefined){
                            curElement.loop.endingLine=a;
                        }
                        if(curElement.loop.index<curElement.loop.to){
                            curElement.loop.index++;
                            if(curElement.loop.type == "foreach"){
                                le.element[curElement.loop.name]=curElement.loop.array[curElement.loop.index-1];
                            }else{
                                le.element[curElement.loop.name] = curElement.loop.index-1;
                            }
                            a = curElement.loop.startingLine-1;
                        }else{
                            curElement.inLoop = false;
                        }
                    }

                }

            }


            if(curAttribute!=""){
                if(line.replace("\\{","").includes("{")){
                    bracketCount++;
                }
                if (line.endsWith("}") || line.replace("\\}","").includes("}")){
                    if(bracketCount>0){
                        bracketCount--;
                    }else{
                        if(curElement.element.getAttribute(curAttribute)!=undefined){
                            attrValue += curElement.element.getAttribute(curAttribute);
                        }
                        if(curAttribute != "style"){
                            if(curAttribute == "stylejs"){
                                var style = eval('({'+attrValue+'})');

                                for(var i=0;i<Object.keys(style).length;i++){
                                    var key = Object.keys(style)[i];
                                    curElement.element.style[key] = style[key];
                                }
                            }else
                            curElement.element.setAttribute(curAttribute,eval(attrValue));
                        }
                        else{
                            curElement.element.setAttribute(curAttribute,attrValue);
                        }
                        if (binding){
                            karbid.binder.bindings.push({element:curElement.element,attr:curAttribute,value:attrValue})
                            binding = false;
                        }
                        curAttribute ="";
                        attrValue = "";
                    }
                }else{
                    //not closed yet
                    attrValue += line;
                }
            }

            if(line.startsWith("attr-")){
                curAttribute = line.split("attr-")[1].split(":")[0];
                if(line[("attr-"+curAttribute+":").length+1]!="{"){
                    attrValue = line.split("attr-"+curAttribute)[1].split(":")[1];
                    curElement.element.setAttribute(curAttribute,eval(attrValue));

                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:curAttribute,value:attrValue})
                        binding = false;
                    }

                    attrValue = "";
                    curAttribute = "";
                }
            }

            //binding for innerHTML
            if(line.startsWith("html:")){
                if (curAttribute=="" && curEvent == ""){ //making sure that we are not inside any attribute or event
                    attrValue = line.split("html:")[1];

                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:"innerHTML",value:attrValue})
                        binding = false;
                    }
                    attrValue = "";

                }
            }



            if(curEvent!=""){
                if (line.endsWith("}}")){
                    if(curElement.element.getAttribute("on"+curEvent)!=undefined){
                        curElement.element.setAttribute("on"+curEvent,curElement.element.getAttribute("on"+curEvent)+";"+eventCode);
                    }else
                    //curElement.element.setAttribute("on"+curEvent,eventCode);
                    curElement.element.addEventListener(curEvent,new Function("ev",eventCode));

                    curEvent ="";
                    eventCode = "";
                    }
                else{
                    //not closed yet
                    eventCode += line;
                }
            }

            if(curEvent == "" && curAttribute == ""){

                //koşullar
                if (line.startsWith("if")){



                    conditions.push({code:line.split("if")[1].trim(),condition:function(){ return eval(line.split("if")[1].trim())}.call(curElement.element)});
                }
                if (line.startsWith("elif")){
                    var con = !eval(conditions[conditions.length-1].code);
                    conditions.push({code:line.split("elif")[1].trim(),condition:function(){return eval(line.split("elif")[1].trim()+" && "+con)}.call(curElement.element)});
                }
                if(line.startsWith("else")){
                    var con = function(){return eval(conditions[conditions.length-1].code)}.call(curElement.element);
                    conditions.push({code:"",condition:!con});
                }

                if (line.startsWith("\"") || line.startsWith("html")){
                    if(line.startsWith("\"")){
                        line = karbid.utils.replaceAt(line,0,"");
                        line = karbid.utils.replaceAt(line,line.length-1,"");
                        curElement.element.innerHTML = line;
                    }else{
                        curElement.html =  line.split("html")[1].substr(line.split("html")[1].indexOf(":")+1);
                        curElement.htmlBefore = curElement.elements.length;

                    }
                }

                //script
                if (line.startsWith ("script")){
                    evalScript = true;
                }

                if(line.endsWith("endscript") || line.startsWith("endscript")){
                    evalScript = false;
                    var sT = document.createElement("script");
                    var sP = document.createTextNode(evalScriptCode);
                    sT.appendChild(sP)
                    document.body.appendChild(sT);
                    evalScriptCode = "";
                    continue;
                }

                if(line.startsWith("ev-")){
                    curEvent = line.split("ev-")[1].split(":")[0];
                }
                //#region some attributes and events
                if(line.startsWith("style:")){
                    curAttribute = "style";
                }
                if(line.startsWith("stylejs")){
                    curAttribute = "stylejs";
                }
                if(line.startsWith("type:")){
                    curAttribute="type";
                    if(!line.startsWith("type:{")){
                        attrValue = line.substr(curAttribute.length+1);
                        curElement.element.setAttribute(curAttribute,eval(attrValue));
                        curAttribute = "";
                        attrValue = "";
                    }
                }
                if(line.startsWith("placeholder:")){
                    curAttribute = "placeholder";
                    if(!line.startsWith("placeholder:{")){
                        attrValue = line.substr(curAttribute.length+1);
                        curElement.element.setAttribute(curAttribute,eval(attrValue));

                        if (binding){
                            karbid.binder.bindings.push({element:curElement.element,attr:curAttribute,value:attrValue})
                            binding = false;
                        }

                        curAttribute = "";
                        attrValue = "";


                    }
                }
                if(line.startsWith("click:")){
                    curEvent = "click";
                }
                if(line.startsWith("width:")){
                    curElement.element.style["width"] = eval(line.split("width:")[1]);

                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:"style.width",value:line.split("width:")[1]})
                        binding = false;
                    }
                }
                if(line.startsWith("height:")){
                    curElement.element.style["height"] = eval(line.split("height:")[1]);

                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:"style.height",value:line.split("height:")[1]})
                        binding = false;
                    }

                }
                if(line.startsWith("border:")){
                    curElement.element.style["border"] = eval(line.split("border:")[1]);

                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:"style.border",value:line.split("border:")[1]})
                        binding = false;
                    }
                }
                if(line.startsWith("background-color:")){
                    curElement.element.style["background-color"] = eval(line.split("background-color:")[1]);

                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:"style.backgroundColor",value:line.split("background-color:")[1]})
                        binding = false;
                    }
                }
                if(line.startsWith("style.")){
                    curElement.element.style[line.split("style.")[1].split(":")[0].trim()] = eval(line.split("style.")[1].split(":")[1]);


                    if (binding){
                        karbid.binder.bindings.push({element:curElement.element,attr:"style."+line.split("style.")[1].split(":")[0].trim(),value:line.split("style.")[1].split(":")[1]})
                        binding = false;
                    }

                }
                if(line.startsWith("input:")){
                    curEvent = "input";
                }
                //#endregion

            }
        }
    },
    utils:{
        of:function(query, all) {
            var elem;
            if (all != undefined) {
                if (all == true) {
                    elem = document.querySelectorAll(query);
                } else {
                    elem = document.querySelector(query);
                }
            } else
                elem = document.querySelector(query);
            return elem;
        },
        replaceAt:function(string, index, replace) {
            return string.substring(0, index) + replace + string.substring(index + 1);
        },
        findElement:function(elements,element){
            for (var a = 0;a<elements.length;a++){
                if(elements[a] == element){
                    return elements[a];
                }
            }
        },
        queryConverter: function(query) {
            var element = {id:"",tag:"",class:""};


            //loop
            if(query.includes(":") && query.includes("(") && query.includes(")")){ //checking if it contains loop
                var name = query.split(":")[0].split("(")[1];
                var to = eval(karbid.utils.replaceAt(query.substr(query.indexOf(":")+1),query.substr(query.indexOf(":")+1).length-1,""))
                //var to = eval(karbid.utils.replaceAt(query.split(name+":")[1].split("{")[0],query.split(name+":")[1].split("{")[0].length-1,""));
                var array = new Array();
                var type = "";
                if(to.constructor === Array){
                    array = to;
                    to=array.length;
                    type = "foreach";
                }else{
                    type="for";
                }


                element.loop = {
                    type:type,
                    name:name,
                    to:to,
                    array:array,
                    index:0,
                    binding:true
                }
                query = query.split(":")[0].split("(")[0];
            }

            var splitter = "";
            for(var i=0;i<query.length;i++){

                if(query[i] == "#") splitter = "#";

                if(query[i] == ".") {splitter=".";}
                if(query[i] == "{") {break;}


                if (splitter==""){
                    element.tag+=query[i];
                }
                if(splitter =="."){
                    element.class+=query[i].replace("."," ");
                }
                if(splitter == "#"){
                    element.id+=query[i].replace("#","");
                }
            }
            element.class = karbid.utils.replaceAt(element.class,0,"");

            return element;
        },
        ajax:{
            get:function(theUrl, callback)
            {
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.onreadystatechange = function() {
                    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                        callback(xmlHttp.responseText);
                }
                xmlHttp.open("GET", theUrl, false);
                xmlHttp.send(null);
            },
            post:function(theUrl, callback)
            {
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.onreadystatechange = function() {
                    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                        callback(xmlHttp.responseText);
                }
                xmlHttp.open("POST", theUrl, false);
                xmlHttp.send(null);
            }
        }
    }
}

var init = new Event("init");

karbid.binder = new karbid.binder()
