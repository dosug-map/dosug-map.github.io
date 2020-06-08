require([
"esri/Map",
"esri/views/MapView", 
"esri/widgets/Home", 
"esri/widgets/ScaleBar", 
"esri/layers/FeatureLayer", 
"esri/widgets/Legend", 
"esri/widgets/LayerList", 
"esri/widgets/AreaMeasurement2D", 
"esri/widgets/DistanceMeasurement2D", 
"esri/Graphic", 
"esri/core/watchUtils",
"esri/layers/GraphicsLayer",
"esri/views/2d/draw/Draw",
"esri/tasks/support/Query",
"esri/widgets/BasemapToggle",
"dojo/on",
"dojo/_base/html",
"esri/geometry/geometryEngine",
"esri/geometry/geometryEngineAsync",
"esri/renderers/smartMapping/statistics/uniqueValues",
"esri/tasks/support/RelationshipQuery",
"dgrid/Grid",
"esri/widgets/Search",
], function(Map, MapView, Home, ScaleBar, FeatureLayer, Legend, LayerList, 
    AreaMeasurement2D, DistanceMeasurement2D, Graphic, watchUtils, GraphicsLayer, 
    Draw, Query, BasemapToggle, on, html, geometryEngine, geometryEngineAsync, uniqueValues, RelationshipQuery, Grid, Search) {
    var activeWidget = null;
        var map = new Map({
        basemap: "osm"
    });

    var map = new Map({
        basemap: "osm"
    });

    var overviewMap = new Map({
    basemap: "osm"
    });

    var view = new MapView({
        container: "viewDiv",
        map: map,
        center: [56.25,58.01],
        zoom: 11
    });

    var mapView = new MapView({
        container: "overviewDiv",
        map: overviewMap,
        constraints: {
            rotationEnabled: false
        }
    });
    mapView.ui.components = [];

    //Перетаскивание радио-кнопок
    window.onload = addListeners();
    function addListeners(){
        document.getElementById('r-buttons').addEventListener('mousedown', mouseDown, false);
        document.getElementById('form-org').addEventListener('mousedown', mouseDown2, false);
        window.addEventListener('mouseup', mouseUp, false);
        window.addEventListener('mouseup', mouseUp2, false);
    }

    function mouseUp()
    {
        window.removeEventListener('mousemove', divMove, true);
    }

    function mouseUp2()
    {
        window.removeEventListener('mousemove', divMove2, true);
    }

    function mouseDown(e){
        window.addEventListener('mousemove', divMove, true);
    }

    function mouseDown2(e){
        window.addEventListener('mousemove', divMove2, true);
    }

    function divMove(e){
        var div = document.getElementById('r-buttons');
        div.style.position = 'absolute';
        div.style.top = e.clientY + 'px';
        div.style.left = e.clientX + 'px';
    }

    function divMove2(e){
        var div = document.getElementById('form-org');
        div.style.position = 'absolute';
        div.style.top = e.clientY + 'px';
        div.style.left = e.clientX + 'px';
    }

    //Обзорная карта
    var ovButton = document.getElementById("ovwButton");
    on(ovButton, 'click', function(){
        if(html.hasClass(ovButton, "ovwHide")){
        html.setAttr(ovButton, 'title', 'Скрыть обзорную карту')
        html.replaceClass(ovButton, "ovwShow","ovwHide");
        }else{
        html.replaceClass(ovButton, "ovwHide","ovwShow");
        html.setAttr(ovButton, 'title', 'Показать обзорную карту');
        }
        html.toggleClass("overviewDiv" ,"hide");
    });

    mapView.when(function() {
        view.when(function() {
            setup();
        });
    });

    function setup() {
    const extent3Dgraphic = new Graphic({
        geometry: null,
        symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
            width: 0.5,
            color: "black"
        }
        }
    });
    mapView.graphics.add(extent3Dgraphic);

    watchUtils.init(view, "extent", function(extent) {
        mapView.goTo({
        center: view.center,
        scale:
            view.scale *
            3 *
            Math.max(
            view.width / mapView.width,
            view.height / mapView.height
            )
        });
    extent3Dgraphic.geometry = extent;
    });
    };

    var homeWidget = new Home({
        view: view
    });

    view.ui.add(homeWidget, "top-left");

    var basemapToggle = new BasemapToggle({
        view: view,
        nextBasemap: "satellite"
    });
    view.ui.add(basemapToggle, "top-right");

    //Координаты курсора
    var coordsWidget = document.getElementById("coordsWidget");
    function showCoordinates(pt) {
        var coords = "Широта: " + pt.latitude.toFixed(3) + "<br>Долгота: " + pt.longitude.toFixed(3);
        coordsWidget.innerHTML = coords;
    };

    view.watch("stationary", function(isStationary) {
        showCoordinates(view.center);
    });

    view.on("pointer-move", function(evt) {
        showCoordinates(view.toMap({ x: evt.x, y: evt.y }));
    });

    var template = {
        title: "Информация об организации",
        "content": "<b>Название организации:</b> {NAME}<br><b>Адрес:</b> {STRT}<br><b>Виды деятельности:</b>" 
    };

    const layer_plt = new FeatureLayer({
        url: "https://services5.arcgis.com/6Ka1GzVVr3OS3dEg/arcgis/rest/services/Perm_gdb/FeatureServer/13?token=N_WZol_cr5XVZzG6bB5mQTnfeTnU1X1qlSbDq9-KIONNhUEyVrhcNNpEXC9AF-onCy7UBKCcjx_b82MIiT_-Mv0fIptEK-6wVqZbh8uO99SWHNzHK3I-91DDAgySRCztbEAKgGI97PDx91TVzte_YXOaYmPJqpzYaxfYIQrLRHj2DF8AsRuWdOktGr-m0Gt053RbsgPBBQ9sIhm-_S7XIXyOohfz2HfF5B99AczSTuc07Z2FwEFhGEalOUBPQVh8",
        outFields:["*"], 
        title: "Плотность организаций по населению",
    });

    var resultsLayer = new GraphicsLayer({
        listMode: "hide",
    });
    map.addMany([resultsLayer]);

    //Слой с точками организаций
    const layer_org = new FeatureLayer({
        url: "https://services5.arcgis.com/6Ka1GzVVr3OS3dEg/arcgis/rest/services/Perm_gdb/FeatureServer/12?token=N_WZol_cr5XVZzG6bB5mQTnfeTnU1X1qlSbDq9-KIONNhUEyVrhcNNpEXC9AF-onCy7UBKCcjx_b82MIiT_-Mv0fIptEK-6wVqZbh8uO99SWHNzHK3I-91DDAgySRCztbEAKgGI97PDx91TVzte_YXOaYmPJqpzYaxfYIQrLRHj2DF8AsRuWdOktGr-m0Gt053RbsgPBBQ9sIhm-_S7XIXyOohfz2HfF5B99AczSTuc07Z2FwEFhGEalOUBPQVh8",
        outFields:["*"], 
        objectIdField: "ID_ORG",
        title: "Организации",
        //popupTemplate: template
    });

    //Непространственная таблица. Скорее всего, можно и без её добавления обойтись, но я на всякий случай добавил
    const table = new FeatureLayer({
        url: "https://services5.arcgis.com/6Ka1GzVVr3OS3dEg/arcgis/rest/services/Perm_gdb/FeatureServer/14?token=N_WZol_cr5XVZzG6bB5mQTnfeTnU1X1qlSbDq9-KIONNhUEyVrhcNNpEXC9AF-onCy7UBKCcjx_b82MIiT_-Mv0fIptEK-6wVqZbh8uO99SWHNzHK3I-91DDAgySRCztbEAKgGI97PDx91TVzte_YXOaYmPJqpzYaxfYIQrLRHj2DF8AsRuWdOktGr-m0Gt053RbsgPBBQ9sIhm-_S7XIXyOohfz2HfF5B99AczSTuc07Z2FwEFhGEalOUBPQVh8",
        outFields:["*"],
    });

    map.add(layer_plt);
    map.add(layer_org);
    //layer_org.popupTemplate = template

    // Ресурсы для строки поиска
    const sources = [
        {
          layer: layer_org,
          searchFields: ["relationships/0/TYPE"],
          displayField: "relationships/0/TYPE",
          exactMatch: false,
          outFields: ["*"],
          name: "Название организации",
          placeholder: "Например: Библиотека",
          maxResults: 6,
          maxSuggestions: 6,
          suggestionsEnabled: true,
          minSuggestCharacters: 0
        }
    ] 

    // Строка поиска
    var search = new Search({
        view: view,
        container: "search",
        sources: sources
    });
    view.ui.add(search);

    //Символы для легенды
    const poltora = {
        type: "simple-fill", 
        color: "#eff3ff",
        style: "solid",
        outline: {
            width: 0.2,
            color: [255, 255, 255, 0.5]
        }
    };

    const dvaspol = {
        type: "simple-fill", 
        color: "#bed8e8",
        style: "solid",
        outline: {
            width: 0.2,
            color: [255, 255, 255, 0.5]
        }
    };

    const chespol = {
        type: "simple-fill", 
        color: "#6bb0d7",
        style: "solid",
        outline: {
            width: 0.2,
            color: [255, 255, 255, 0.5]
        }
    };

    const shest = {
        type: "simple-fill", 
        color: "#2d83be",
        style: "solid",
        outline: {
            width: 0.2,
            color: [255, 255, 255, 0.5]
        }
    };

    const bolshest = {
        type: "simple-fill", 
        color: "#02509d",
        style: "solid",
        outline: {
            width: 0.2,
            color: [255, 255, 255, 0.5]
        }
    }; 

    //Легенда
    layer_plt.renderer = {
        type: "class-breaks",
        field: "Plot_popul",
        legendOptions: {
            title: "Плотность организаций по численности населения (в возрасте старше трудосопособного), орг./10 тыс. чел."
        },
        classBreakInfos: [
            {
            minValue: 0,
            maxValue: 2.7999,
            symbol: poltora,
            label: "менее 3"
        }, {
            minValue: 2.8,
            maxValue: 4.4999,
            symbol: dvaspol,
            label: "3 - 4,5"
        }, {
            minValue: 4.5,
            maxValue: 5.4999,
            symbol: chespol,
            label: "4,5 - 5,5"
        }, {
            minValue: 5.5,
            maxValue: 6.9999,
            symbol: shest,
            label: "5,5 - 7"
        }, {
            minValue: 7,
            maxValue: 8.2,
            symbol: bolshest,
            label: "более 7"
        }
    ]
    }

    var bufferLayer = new GraphicsLayer({
        listMode: "hide"
    });
    var pointLayer = new GraphicsLayer({
        listMode: "hide"
    });

    //Нижнее окно с информацией об организациях
    var highlight, grid;

    const clearbutton = document.getElementById("clearButton");
    clearbutton.addEventListener("click", clearMap);

    layer_org.load().then(function() {
        return (g = new Grid());
    });

    var id_point
    view.on("click", function (event) {
        var screenPoint = {
          x: event.x,
          y: event.y
        };

        view.hitTest(screenPoint).then(function (response) {
            if (response.results.length) {
             var graphic = response.results.filter(function (result) {
              return result.graphic.layer === layer_org;
             })[0].graphic;
             console.log(graphic.attributes.ID_ORG);
             document.getElementById("gridDiv2").setAttribute("style","display: none");
             document.getElementById("gridDiv3").setAttribute("style","display: block");
             document.getElementById("infos").innerHTML = "Название: " + graphic.attributes.NAME;
             document.getElementById("infos2").innerHTML = "Адрес: " + graphic.attributes.STRT;
             document.getElementById("ots").innerHTML = " <br>";
             id_point = graphic.attributes.ID_ORG;
             queryFeatures1(id_point); 
             id_point = null
            }
        });
    }); 

    function queryFeatures1(id_point) {
        //clearMap();
        //Выделение значка
        view.whenLayerView(layer_org).then(function(layerView) {
        if (highlight) {
            highlight.remove();
        }
        highlight = layerView.highlight(id_point);
        });

        layer_org.queryRelatedFeatures({
            outFields: ["TYPE", "CATEGORY"],
            relationshipId: layer_org.relationships[0].id,
            objectIds: id_point
        })

        .then(function(relatedFeatureSetByObjectId) {
            if (!relatedFeatureSetByObjectId) {
              return;
        }
       
        // Для данных создается таблица
        Object.keys(relatedFeatureSetByObjectId).forEach(function(
            id_point
          ) {
            const relatedFeatureSet = relatedFeatureSetByObjectId[id_point];
            const rows = relatedFeatureSet.features.map(function(feature) {
              return feature.attributes;
            });

            if (!rows.length) {
              return;
            }

            const gridDiv = document.createElement("div");
            const results = document.getElementById("queryResults");
            results.appendChild(gridDiv);

            if (grid) {
              grid.destroy();
            }

            /* Здесь не совсем понял как в label поменять названия колонок */
            grid = new Grid(
              {
                columns: Object.keys(rows[0]).map(function(fieldName) {
                  return {
                    label: fieldName,
                    field: fieldName,
                    sortable: true
                  };
                })
              },
              gridDiv
            );

            grid.renderArray(rows);
          });
          clearbutton.style.display = "inline";
        })
        .catch(function(error) {
          console.error(error);
        });
    }

    function clearMap() {
        document.getElementById("infos").innerHTML = null;
        document.getElementById("infos2").innerHTML = null;
        document.getElementById("ots").innerHTML = null;
        document.getElementById("gridDiv3").setAttribute("style","display: none");
        document.getElementById("gridDiv2").setAttribute("style","display: block");
        if (highlight) {
          highlight.remove();
        }
        if (grid) {
          grid.destroy();
        }
        clearbutton.style.display = "none";
    };

    var ids = [];  
    
    /// ----------- Радио-кнопки ----------- ///
    document.getElementById("r1").addEventListener("click", queryFeatures2);
    document.getElementById("r2").addEventListener("click", queryFeatures3);
    document.getElementById("r3").addEventListener("click", queryFeatures4);
    document.getElementById("r4").addEventListener("click", queryFeatures5);
    document.getElementById("r5").addEventListener("click", queryFeatures6);
    document.getElementById("r6").addEventListener("click", queryFeatures7);
    document.getElementById("r7").addEventListener("click", clearMap2);

    // Форма для заявки на добавление организации
    document.getElementById("dobav-org").addEventListener("click", form_org);
    let bb = document.querySelector('#form-org');
    var updownElem = document.getElementById('dobav-org');
    var pageYLabel = 0;
    function form_org() {
        if (bb.style.display != 'block') {
            bb.style.display = 'block'
            var pageY = window.pageYOffset || document.documentElement.scrollTop;
            switch (this.className) {
                case 'dobav-org':
                    pageYLabel = pageY;
                    window.scrollTo(0, 700);
                    this.className = 'dobav-org';
            }
        } 
        else 
            bb.style.display = 'none' 
    }

    document.getElementById("close-but").addEventListener("click", close_form);
    function close_form() {
        bb.style.display = 'none'
    }

    function clearMap2() {
        if (highlight) {
            highlight.remove();
        }
        ids = []
    };
    
    // Функции радио-кнопок
    function queryFeatures2() {
        clearMap2();
        var objectIds = [];
        objectIds = [1,2,3,4,10,17,24,31,32,34,35,36,37,41,43,44,45,53,54,59,61,62,63,65,66,67,68,70,71,72,74,75,76,77,78,79,80,81,82,83,85,86,87,89,90,91,93,94,95,97,101,102,103,104,105,107]
        layer_org.queryObjectIds().then(function(result2) {
            view.whenLayerView(layer_org).then(function(layerView) {
                if (highlight) {
                    highlight.remove();
                } 
                console.log(result2);
                let i = 0, k = 0; 
                for (k = 0; ids.length <=56; ) {
                    if (result2[k] == objectIds[i]) {
                        ids.push(result2[k]);
                        i++; k++
                    } else {
                        k++
                    }
                } 
                highlight = layerView.highlight(ids); 
            }) 
        })
        
        //Поиск всех точек, в связанных записях которых в поле CATEGORY есть "Здоровье" (задача - визуально выделить)
        //Я так понял, нужно "пробежаться" по всем орг-циям (точкам на карте), поэтому цикл:
        /*var objectIds = 1;
        var i = objectIds;
        for (objectIds = 1; objectIds <= 83; objectIds++) { // Всего в слое 82 точки, но 19-я удалялась когда-то, поэтому такой OBJECTID отсутствует
        layer_org.queryRelatedFeatures({
            outFields: ["CATEGORY"],
            relationshipId: layer_org.relationships[0].id,
            objectIds: objectIds
        })
        
        .then(function(relatedFeatureSetByObjectId) {
            if (!relatedFeatureSetByObjectId) {
                return;
            }
        
        Object.keys(relatedFeatureSetByObjectId).forEach(function(
            objectIds
            ) {
            const relatedFeatureSet = relatedFeatureSetByObjectId[objectIds];
            const rows = relatedFeatureSet.features.map(function(feature) {
            rows2 = feature.attributes.CATEGORY;
            console.log(rows2);
            if (rows2 == b_value) { // Если найденная запись это "Здоровье", она равна b_value, выполняется обратный запрос, чтобы получить ID точки на карте
                console.log(objectIds);
                view.whenLayerView(layer_org).then(function(layerView) {
                    layer_org.queryObjectIds().then(function(result2) { // Получаем массив result2 с OBJECTID всех точек слоя
                        console.log(result2); 
                        if (result2[i] == objectIds) { // Если элемент массива совпадает с нужным значением, 
                            ids.push(result2[i]); // элемент записывается в массив ids для выделения через highlights
                            highlight2 = layerView.highlight(ids) // Если подставлять просто цифру, например переменую 'objectIds', выделение не срабатывает. Нужен именно OBJECTID
                        } // Эта часть кода (выделение) почему-то не работает, выделятся только точка с ID = 1...
                    })   
                })
            }
            });
            })
        }); 
        }*/
    }

    function queryFeatures3() {
        clearMap2();
        var objectIds = [];
        objectIds = [1,2,5,25,30,33,35,37,40,45,46,48,50,55,58,60,66,67,69,76,78,84,85,86,96,99,100]
        layer_org.queryObjectIds().then(function(result2) {
            view.whenLayerView(layer_org).then(function(layerView) {
                if (highlight) {
                    highlight.remove();
                } 
                console.log(result2);
                let i = 0, k = 0; 
                for (k = 0; ids.length <=11; ) {
                    if (result2[k] == objectIds[i]) {
                        ids.push(result2[k]);
                        i++; k++
                    } else {
                        k++
                    }
                } 
                highlight = layerView.highlight(ids); 
            }) 
        })
    }   
    
    function queryFeatures4() {
        clearMap2();
        var objectIds = [];
        objectIds = [2,15,20,21,22,23,31,36,39,42,46,50,52,60,61,63,70,78,93,104]
        layer_org.queryObjectIds().then(function(result2) {
            view.whenLayerView(layer_org).then(function(layerView) {
                if (highlight) {
                    highlight.remove();
                } 
                console.log(result2);
                let i = 0, k = 0; 
                for (k = 0; ids.length <=20; ) {
                    if (result2[k] == objectIds[i]) {
                        ids.push(result2[k]);
                        i++; k++
                    } else {
                        k++
                    }
                } 
                highlight = layerView.highlight(ids); 
            }) 
        })
    }  

    function queryFeatures5() {
        clearMap2();
        var objectIds = [];
        objectIds = [4,6,14,15,16,18,20,22,26,27,28,30,37,38,40,50,60,63,67,68,71,78,84,88]
        layer_org.queryObjectIds().then(function(result2) {
            view.whenLayerView(layer_org).then(function(layerView) {
                if (highlight) {
                    highlight.remove();
                } 
                console.log(result2);
                let i = 0, k = 0; 
                for (k = 0; ids.length <=36; ) {
                    if (result2[k] == objectIds[i]) {
                        ids.push(result2[k]);
                        i++; k++
                    } else {
                        k++
                    }
                } 
                highlight = layerView.highlight(ids); 
            }) 
        })
    } 

    function queryFeatures6() {
        clearMap2();
        var objectIds = [];
        objectIds = [1,2,4,7,8,11,14,18,20,21,30,34,35,37,40,41,42,43,45,46,47,49,54,55,56,59,60,62,64,66,67,68,70,71,72,73,74,75,76,77,78,79,80,84,85,86,92,93,94,100,105]
        layer_org.queryObjectIds().then(function(result2) {
            view.whenLayerView(layer_org).then(function(layerView) {
                if (highlight) {
                    highlight.remove();
                } 
                console.log(result2);
                let i = 0, k = 0; 
                for (k = 0; ids.length <=51; ) {
                    if (result2[k] == objectIds[i]) {
                        ids.push(result2[k]);
                        i++; k++
                    } else {
                        k++
                    }
                } 
                highlight = layerView.highlight(ids); 
            }) 
        })
    }

    function queryFeatures7() {
        clearMap2();
        var objectIds = [];
        objectIds = [1,2,4,5,7,8,9,10,11,12,13,15,23,29,30,31,35,36,40,46,47,48,51,54,57,60,67,71,73,75,76,77,78,85,86,93,98,100,105,106]
        layer_org.queryObjectIds().then(function(result2) {
            view.whenLayerView(layer_org).then(function(layerView) {
                if (highlight) {
                    highlight.remove();
                } 
                console.log(result2);
                let i = 0, k = 0; 
                for (k = 0; ids.length <=40; ) {
                    if (result2[k] == objectIds[i]) {
                        ids.push(result2[k]);
                        i++; k++
                    } else {
                        k++
                    }
                } 
                highlight = layerView.highlight(ids); 
            }) 
        })
    }

    var legend = new Legend({
        view: view,
        layerInfos: [{
            layer: layer_plt,
            title: "Условные обозначения"
        }],
        container: "legend"
    });

    var layerList = new LayerList({
        view: view,
        container: "layer-list"
    });

    view.ui.add(layerList);

    var scaleBar = new ScaleBar({
        view: view,
        unit:'metric',
        style: 'ruler',
        container: "scalebar"
    });

    view.ui.add(scaleBar, {
        position: "bottom-right"
    });

    //Измерительные виджеты
    view.ui.add("topbar", "top-right");
    document.getElementById("distanceButton").addEventListener("click",
    function () {
        setActiveWidget(null);
        if (!this.classList.contains('active')) {
            setActiveWidget('distance');
        } else {
            setActiveButton(null);
        }
    });

    document.getElementById("areaButton").addEventListener("click",
    function () {
        setActiveWidget(null);
        if (!this.classList.contains('active')) {
            setActiveWidget('area');
        } else {
            setActiveButton(null);
        }
    });

    function setActiveWidget(type) {
        switch (type) {
        case "distance":
            activeWidget = new DistanceMeasurement2D({
                view: view
            });

            activeWidget.viewModel.newMeasurement();

            view.ui.add(activeWidget, "top-right");
            setActiveButton(document.getElementById('distanceButton'));
        break;
        case "area":
            activeWidget = new AreaMeasurement2D({
                view: view
            });

            activeWidget.viewModel.newMeasurement();

            view.ui.add(activeWidget, "top-right");
            setActiveButton(document.getElementById('areaButton'));
        break;
        case null:
            if (activeWidget) {
                view.ui.remove(activeWidget);
                activeWidget.destroy();
                activeWidget = null;
            }
        break;
        }
    }

    function setActiveButton(selectedButton) {
        view.focus();
        var elements = document.getElementsByClassName("active");
        for (var i = 0; i < elements.length; i++) {
            elements[i].classList.remove("active");
        }
        if (selectedButton) {
            selectedButton.classList.add("active");
        }
    }

    view.ui.add(legend); 

    //Построение буфера
    view.ui.add("line-button", "top-left");

    var info_d = document.getElementById('info_d');

    //Кнопки показать/скрыть легенду
    document.getElementById("min-legend").onclick = function () {
        document.getElementById("legend").setAttribute("style","display: block");
        document.getElementById("min-legend").setAttribute("style","display: none");
        document.getElementById("min-legend2").setAttribute("style","display: block");
    }

    document.getElementById("min-legend2").onclick = function () {
        document.getElementById("legend").setAttribute("style","display: none");
        document.getElementById("min-legend").setAttribute("style","display: block");
        document.getElementById("min-legend2").setAttribute("style","display: none");
    }

    //Кнопки показать/скрыть список слоев
    document.getElementById("min-list").onclick = function () {
        document.getElementById("layer-list").setAttribute("style","display: block");
        document.getElementById("min-list").setAttribute("style","display: none");
        document.getElementById("min-list2").setAttribute("style","display: block");
    }

    document.getElementById("min-list2").onclick = function () {
        document.getElementById("layer-list").setAttribute("style","display: none");
        document.getElementById("min-list").setAttribute("style","display: block");
        document.getElementById("min-list2").setAttribute("style","display: none");
    }

    // Продолжение буфера
    document.getElementById("line-button").onclick = function() {
        pointLayer.removeAll();
        bufferLayer.removeAll();
        document.getElementById("info_d").innerHTML = " ";
        document.getElementById("clearGraph").setAttribute("style","display: block");
        document.getElementById("info_d").setAttribute("style","display: block");
        map.addMany([bufferLayer, pointLayer]);
        var polySym = {
            type: "simple-fill", 
            color: [50, 170, 220, 0.5],
            outline: {
            color: [0, 0, 0, 0.5],
            width: 1
            }
        }
    
        var pointSym = {
            type: "simple-marker", 
            color: [150, 150, 150],
            outline: {
            color: [0, 0, 0],
            width: 1
            },
            size: 5
        }

        view.on("click", function(event) {
            bufferPoint(event.mapPoint);
            resultsLayer.removeAll();
            info_d.innerHTML = " ";
            info_d.setAttribute("contenteditable", true);
        })

        function bufferPoint(point) {
            clearGraphics();
            pointLayer.add(
                new Graphic({
                geometry: point,
                symbol: pointSym
                })
            );
            var buffer = geometryEngine.geodesicBuffer(point, 1, "kilometers");
            bufferLayer.add(
                new Graphic({
                geometry: buffer,
                symbol: polySym
                })
            );
            Query_d(buffer)
        }

        function clearGraphics() {
            pointLayer.removeAll();
            bufferLayer.removeAll();
        }

        async function Query_d(buffer) {
            var query = layer_org.createQuery();
            query.geometry = buffer;
            query.spatialRelationship = "intersects";
            query.returnGeometry = true;
            layer_org.queryFeatureCount(query).then(function(numResults){
                r = numResults;
                setTimeout(info_d.innerHTML = "<b>В радиусе 1 км найдено организаций: </b>" + r, 4);
            });			
            layer_org.queryFeatures(query).then(function(results){
                displayResults(results);
            })
        }

        function displayResults(results) {
            if (document.getElementById('clearGraph').style.display == 'block'){
                var features = results.features.map(function (graphicQrOOPT) {
                    graphicQrOOPT.symbol = {
                        type: "simple-marker",
                        style: "diamond",
                        size: 11,
                        color: [100, 0, 160]
                    };
                    return graphicQrOOPT;
                });
                resultsLayer.addMany(features);
            }
        }
    };
    
    document.getElementById("clearGraph").addEventListener("click", function () {
        map.layers.remove(bufferLayer);
        map.layers.remove(pointLayer);
        view.graphics.removeAll();
        pointLayer.removeAll();
        bufferLayer.removeAll();
        document.getElementById("info_d").setAttribute("style","display: none");
        document.getElementById("clearGraph").setAttribute("style","display: none");
        resultsLayer.removeAll();
        document.getElementById("info_d").innerHTML = " ";
    })
});


var updownElem = document.getElementById('dobav-org');
var pageYLabel = 0;
updownElem.onclick = function() {
    var pageY = window.pageYOffset || document.documentElement.scrollTop;
    switch (this.className) {
        case 'dobav-org':
        pageYLabel = pageY;
        window.scrollTo(0, 1000);
        this.className = 'dobav-org';
    }
}