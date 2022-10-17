import React, { useEffect, useState, useRef } from "react";
import {
  Observable,
  forkJoin,
  combineLatest,
  from,
  mergeMap,
  scan,
  concatMap,
  of,
  map,
  pipe,
} from "rxjs";
import { ajax } from "rxjs/ajax";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import moment from "moment";
import { MdRemoveCircle } from "react-icons/md";
const consola = require("consola");
const qs = require("qs");

//base url to be added to string generated by query parser
const baseUrl = "https://api.gdeltproject.org/api/v2/doc/doc?format=html&";

//colors array to assign to each search item to use for line graph
const linegraphColors: string[] = [
  "#0099CC",
  "#FF6600",
  "#00CC00",
  "#924CB9",
  "#BF4E93",
];

function Home() {
  const inputRef: any = useRef(""); //query searchbox input ref

  //search term keyword variable
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [data, setData] = useState<any[]>([]); //data to store graph points
  const [fullData, setFullData] = useState<any[]>([]); //combined data of search results

  const [searchTermsArray, setSearchTermsArray] = useState<string[]>([]); //array to store only search terms without their endpoints

  const [loading, setLoading] = useState<boolean>(false);
  const [dataFetched, setDataFetched] = useState<boolean>(false);

  //array of search terms and their generated endpoints which would be fetched using observables
  const [searchTermsEndpointsArray, setSearchTermsEndpointsArray] =
    useState<any>([]);

  const updateUrl = (url: any) => {
    setSearchTerm(url.target.value);
  };

  // const [mode, setMode] = useState("timelinevol"); //default mode for radio button
  const mode = useRef("timelinevol");
  const radioBtnChanged = (e: any) => {
    //change the mode (timelinevol, timelinevolraw or timelinevolinfo) depending on user selection without rerendering component
    // setMode(e.target.value);
    mode.current = e.target.value;
  };

  //🚧🚧🚧//
  const addSearchTerm = () => {
    if (inputRef.current.value.trim() == "") {
      alert("search cannot be empty");
      return;
    }
    setSearchTermsArray([...searchTermsArray, searchTerm]);
    inputRef.current.value = "";
  };
  //🚧🚧🚧//

  const [forceRender, setForceRender] = useState<boolean>(false);
  const removeSearchTerm = (item: string, idx: number) => {
    const temp = searchTermsArray;
    const index = temp.indexOf(item);
    if (index > -1) {
      // only splice array when item is found
      temp.splice(index, 1); // 2nd parameter means remove one item only
    }
    setSearchTermsArray(temp);
    setForceRender(!forceRender);
  };

  const enterKeyPressed = (e: any) => {
    if (e.keyCode === 13) {
      addSearchTerm();
    }
  };

  //🚧🚧🚧//
  const clearSearchTermsArray = () => {
    setSearchTermsArray([]);
  };
  //🚧🚧🚧//

  //🚧🚧🚧//
  const generateData = () => {
    if (searchTermsArray.length == 0) {
      alert("Search list cannot be empty");
      return;
    }

    setLoading(true);

    //generate endpoint for each search term
    let temp: any[] = [];
    for (let count = 0; count < searchTermsArray.length; count++) {
      const endpoint =
        baseUrl +
        qs.stringify({
          startdatetime: 20221001000000,
          enddatetime: 20221007235959,
          query: searchTermsArray[count],
          mode: mode.current,
          maxrecords: 75,
          format: "json",
          sort: "hybridrel",
        });
      const query: any = { searchTerm: searchTermsArray[count], endpoint };
      temp.push(query);
    }
    // consola.info(temp);

    // setSearchTermsEndpointsArray(temp);

    //🎈🎈🎈creating observable from a url for a forkJoin call🎈🎈🎈*/
    // let url1 =
    //   "https://api.gdeltproject.org/api/v2/doc/doc?format=html&startdatetime=20221001000000&enddatetime=20221007235959&query=messi&mode=timelinevolinfo&maxrecords=75&format=json&sort=hybridrel";
    // let url2 =
    //   "https://api.gdeltproject.org/api/v2/doc/doc?format=html&startdatetime=20221001000000&enddatetime=20221007235959&query=ronaldo&mode=timelinevolinfo&maxrecords=75&format=json&sort=hybridrel";
    // const urlObservable1 = from(ajax.getJSON(url1));
    // const urlObservable2 = from(ajax.getJSON(url2));
    // forkJoin([urlObservable1, urlObservable2]).subscribe((data) => {
    //   consola.info(data);
    // });
    /*🎈🎈🎈****creating observable from a url for a forkJoin call🎈🎈🎈*/

    //👇️👇️👇️Converting object into array👇️👇️👇️
    // const obj = { name: "Tom", country: "Chile" };
    // const keys = Object.keys(obj);
    // consola.info(keys); // 👉️ ['name', 'country']
    // const values = Object.values(obj);
    // consola.warn(values); // 👉️ ['Tom', 'Chile']
    // const entries = Object.entries(obj);
    // consola.success(entries); // 👉️ [['name', 'Tom'], ['country', 'Chile']]
    //👆👆👆Converting object into array👆👆👆

    const requests = temp.map((item: any, idx: number) => {
      return ajax.getJSON(item.endpoint).pipe(
        map((result) => {
          return {
            queryInfo: item,
            queryResult: result,
          };
        })
      );
    });

    let reqData: any;
    forkJoin(requests).subscribe((res) => {
      reqData = res;

      const combinedQueriesData = reqData.map((item: any, idx: number) => {
        return {
          searchTerm: item?.queryResult?.query_details?.title,
          resultsData: item?.queryResult?.timeline[0]?.data,
        };
      });

      // consola.success(combinedQueriesData);

      //store search keywords,  and length of results for each item's search data
      // let noKeywordsSearched: number = combinedQueriesData.length;
      let keywordsSearched: string[] = [];
      for (let count = 0; count < combinedQueriesData.length; count++) {
        keywordsSearched.push(combinedQueriesData[count].searchTerm);
      }
      let lenKeywordDataResult: number =
        (combinedQueriesData[0]?.resultsData).length;

      //modes can timelinevol, timelinevolraw or timelinevolinfo. Regardless the mode type. We gather the object keys from the mode type produced
      const modeKeys = Object.keys(combinedQueriesData[0]?.resultsData[0]);
      // consola.info(modeKeys);

      //according to dates, group all data for each search term
      let finalCombined: any[] = [];
      for (let count = 0; count < lenKeywordDataResult; count++) {
        //get specific date from result
        let originalDateFormat =
          combinedQueriesData[0]?.resultsData[count].date;
        let cnvtDateFormat = moment(originalDateFormat).format("D MMM LT");

        let tmpSearchKeywordData: any = { date: cnvtDateFormat };

        for (let count = 0; count < keywordsSearched.length; count++) {
          // const tempData = (combinedQueriesData[0]?.resultsData[count]).filter((item:any,pos:number)=>{
          //   item.date === date
          // })

          const keywordData = (combinedQueriesData[count]?.resultsData).filter(
            (item: any, pos: number) => {
              return item.date === originalDateFormat;
            }
          );
          // consola.info("date: ", date);
          // consola.info("search term", combinedQueriesData[count]?.searchTerm);
          // consola.info("search term data: ", data);

          tmpSearchKeywordData[combinedQueriesData[count]?.searchTerm] =
            keywordData[0];
        }

        finalCombined.push(tmpSearchKeywordData);
      }

      //this data object is grouped by date, and for each date it gives the search terms data which fell under that date
      // consola.success(finalCombined);
      // consola.info(finalCombined[0]);
      // consola.info(finalCombined[1]);

      //from the final combined data, we filter out the one we need for the graph,
      const graphData: any[] = [];
      for (let count = 0; count < finalCombined.length; count++) {
        //first store date in graph data object
        let tmpGraphData: any = { date: finalCombined[count].date };
        const x = count;

        //loop through the search keyword names and append their values to form an object
        for (let count = 0; count < keywordsSearched.length; count++) {
          tmpGraphData[keywordsSearched[count]] =
            finalCombined[x][keywordsSearched[count]]?.value;
        }

        graphData.push(tmpGraphData);
      }

      setData(graphData);
      setFullData(finalCombined);
      setDataFetched(true);
      setLoading(false);
    });
  };
  //🚧🚧🚧//

  //🚧🚧🚧//
  const ToolTipContent = ({
    active,
    payload,
    label,
  }: {
    active: any;
    payload: any;
    label: any;
  }) => {
    const highlightedDataPoint: any[] = fullData.filter(
      (item: any, pos: number) => {
        return item.date == label;
      }
    );

    if (active && payload && payload.length) {
      return (
        <div
          style={{
            display: "flex",
            backgroundColor: "white",
            flexDirection: "column",
            padding: "10px 10px 10px 5px",
            boxShadow: "0px 0px 5px 1px grey",
            maxWidth: 350,
            borderRadius: 5,
          }}
        >
          <p
            style={{
              fontSize: 10,
              padding: 0,
              margin: 0,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {label}
          </p>
          {searchTermsArray.map((item: any, pos: number) => {
            return (
              <>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    padding: 0,
                    margin: 0,
                    paddingTop: 10,
                    color: `${linegraphColors[pos]}`,
                  }}
                  key={pos}
                >
                  {item}
                </p>
                <div key={pos + 1}>
                  {mode.current == "timelinevolraw" ? (
                    <>
                      <span
                        style={{
                          fontSize: 12,
                          margin: 0,
                          paddingTop: 5,
                        }}
                        key={pos + 2}
                      >
                        norm:{" "}
                        <span key={pos + 3} style={{ fontWeight: "bold" }}>
                          {`${highlightedDataPoint[0][item].norm}` == undefined
                            ? ""
                            : `${highlightedDataPoint[0][item].norm}`}
                        </span>
                      </span>
                      <span key={pos + 4}> </span>
                    </>
                  ) : null}

                  <span
                    style={{
                      fontSize: 12,

                      margin: 0,
                      paddingTop: 5,
                      color: `${linegraphColors[pos]}`,
                    }}
                    key={pos + 5}
                  >
                    value:{" "}
                    <span key={pos + 6} style={{ fontWeight: "bold" }}>
                      {`${highlightedDataPoint[0][item].value}` == undefined
                        ? ""
                        : `${highlightedDataPoint[0][item].value}`}
                    </span>
                  </span>

                  {mode.current == "timelinevolinfo" ? (
                    <>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          paddingTop: 5,
                          color: `${linegraphColors[pos]}`,
                          margin: 0,
                        }}
                      >
                        Top articles
                      </p>

                      {highlightedDataPoint[0][item]?.toparts == undefined ? (
                        <></>
                      ) : (
                        <p
                          style={{
                            fontSize: 12,
                            margin: 0,
                            paddingTop: 5,
                            maxWidth: 350,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: `${linegraphColors[pos]}`,
                          }}
                          key={pos + 7}
                        >
                          {topArticles(highlightedDataPoint[0][item]?.toparts)}
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              </>
            );
          })}
        </div>
      );
    }

    return null;
  };
  //🚧🚧🚧//

  /**number of top articles to render */
  const topArticles = (article: any) => {
    let articles: any = [];
    var noArticles = 2;
    for (let i = 0; i < noArticles; i++) {
      articles.push(
        <>
          <span key={i}>{article[i].title}</span>
          <br />
        </>
      );
    }
    return articles;
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100%",
          paddingTop: 20,
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              flex: 0.5,
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <input
                placeholder="Enter search query"
                style={{
                  display: "flex",
                  width: "40%",
                  backgroundColor: "transparent",
                  paddingLeft: 10,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderRadius: 10,
                  outline: "none",
                  alignSelf: "center",
                }}
                ref={inputRef}
                onKeyUp={enterKeyPressed}
                onChange={updateUrl}
              />

              <button
                style={{
                  display: "flex",
                  border: "1px solid dodgerblue",
                  backgroundColor: "white",
                  color: "dodgerblue",
                  cursor: "pointer",
                  borderRadius: 10,
                  outline: "none",
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 15,
                  paddingRight: 15,
                  marginLeft: 10,
                  justifyContent: "center",
                  alignSelf: "center",
                }}
                onClick={addSearchTerm}
              >
                Add to list
              </button>

              <button
                style={{
                  display: "flex",
                  border: "1px solid dodgerblue",
                  backgroundColor: "white",
                  color: "dodgerblue",
                  cursor: "pointer",
                  borderRadius: 10,
                  outline: "none",
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 15,
                  paddingRight: 15,
                  marginLeft: 10,
                  justifyContent: "center",
                  alignSelf: "center",
                }}
                onClick={clearSearchTermsArray}
              >
                Clear list
              </button>
            </div>

            <div
              onChange={radioBtnChanged}
              style={{
                display: "flex",

                justifyContent: "center",
                paddingTop: 10,
                paddingBottom: 10,
              }}
            >
              <input
                style={{ marginLeft: 0 }}
                type="radio"
                value="timelinevol"
                name="mode"
                defaultChecked
              />{" "}
              TimelineVol
              <input
                style={{ marginLeft: 15 }}
                type="radio"
                value="timelinevolraw"
                name="mode"
              />{" "}
              TimelineVolRaw
              <input
                style={{ marginLeft: 15 }}
                type="radio"
                value="timelinevolinfo"
                name="mode"
              />{" "}
              TimelineVolInfo
              <input
                style={{ marginLeft: 15 }}
                type="radio"
                value="timelinetone"
                name="mode"
              />{" "}
              TimelineTone
            </div>

            <div
              style={{
                display: "flex",

                justifyContent: "center",
              }}
            >
              <button
                style={{
                  display: "flex",
                  border: "1px solid dodgerblue",
                  backgroundColor: "white",
                  color: "dodgerblue",
                  cursor: "pointer",
                  marginTop: 10,
                  marginBottom: 10,
                  borderRadius: 10,
                  outline: "none",
                  paddingTop: 10,
                  paddingBottom: 10,
                  width: "20%",
                  justifyContent: "center",
                  alignSelf: "center",
                }}
                onClick={generateData}
              >
                Generate Data
              </button>
              {loading ? (
                <p
                  style={{
                    fontSize: 12,
                    paddingLeft: 10,
                    alignSelf: "center",
                  }}
                >
                  loading ...
                </p>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flex: 0.5,
              flexDirection: "column",
            }}
          >
            <p
              style={{
                padding: 0,
                margin: 0,
                fontSize: 14,
                fontWeight: "bold",
                paddingBottom: 5,
              }}
            >
              Search keywords Comparison List
            </p>

            {searchTermsArray.map((count: any, idx: number) => {
              return (
                <div style={{ display: "flex" }}>
                  <p
                    key={idx}
                    style={{
                      padding: 0,
                      margin: 0,
                      fontSize: 14,
                      color: `${linegraphColors[idx]}`,

                      marginRight: 10,
                    }}
                  >
                    {count}
                  </p>
                  <MdRemoveCircle
                    style={{ cursor: "pointer" }}
                    key={count}
                    onClick={() => {
                      removeSearchTerm(count, idx);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <ResponsiveContainer width="100%" height="75%">
          <LineChart
            width={500}
            height={500}
            data={dataFetched ? data : []}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              style={{ fontSize: 10, fontWeight: "bold" }}
              angle={0}
              dataKey={dataFetched ? "date" : ""}
            />
            <YAxis />
            <Tooltip
              content={
                <ToolTipContent
                  active={null}
                  payload={undefined}
                  label={undefined}
                />
              }
            />

            <Legend />

            {dataFetched ? (
              <>
                {searchTermsArray.map((item: any, pos: number) => {
                  return (
                    <Line
                      key={pos}
                      type="monotoneX"
                      stroke={linegraphColors[pos]}
                      strokeWidth={2}
                      dataKey={item}
                      legendType="plainline"
                    />
                  );
                })}
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default Home;
