# Performance Observer Demo

## With Daemon

|                                 | average            | p95                |
| ------------------------------- | ------------------ | ------------------ |
| total                           | 0.9830459000000019 | 1.4309999999999263 |
| create-project-graph-async      | 0.9472641599999997 | 1.3846250000000282 |
| total for sendMessageToDaemon() | 0.9062550599999895 | 1.357958999999937  |
| deserialize daemon response     | 0.4192583399999921 | 0.5780409999999847 |

## Without Daemon

|                                                                          | average                | p95                    |
| ------------------------------------------------------------------------ | ---------------------- | ---------------------- |
| total                                                                    | 4.344744980000001      | 4.925958000000037      |
| create-project-graph-async                                               | 4.158941679999998      | 4.67837499999996       |
| create-project-graph-async >> retrieve-project-configurations            | 1.8439825000000019     | 1.9377499999999372     |
| nx/project-json/build-nodes/package-json-next-to-project-json            | 0.25324837999999544    | 0.1492079999999305     |
| nx/js                                                                    | 0.2578949600000101     | 0.14975000000004002    |
| nx/target-defaults/target-defaults-plugin                                | 0.22542911999999204    | 0.13258300000006784    |
| nx/package-json-workspaces                                               | 0.08119331999998394    | 0.11633299999994051    |
| nx/project-json/build-nodes/project-json                                 | 0.047206639999992604   | 0.06795799999997598    |
| workspace context init                                                   | 0.8645830000000387     | 0.8645830000000387     |
| build-project-configs                                                    | 1.1397699800000054     | 1.3982499999999618     |
| nx/core/package-json:createNodes                                         | 0.9248633800000061     | 1.1007080000000542     |
| nx/js/dependencies-and-lockfile:createNodes                              | 0.8764207800000031     | 1.0410000000000537     |
| nx/core/target-defaults:createNodes                                      | 0.1949507800000015     | 0.32150000000001455    |
| nx/core/package-json-workspaces:createNodes                              | 0.10666999999998779    | 0.23745800000006057    |
| nx/core/project-json:createNodes                                         | 0.007376720000004298   | 0.01529199999993125    |
| createNodes:merge                                                        | 0.1347333000000026     | 0.24491699999998673    |
| create-project-graph-async >> retrieve-workspace-files                   | 0.30559830000000376    | 0.2987080000000333     |
| native-file-deps                                                         | 0.00030172000000220576 | 0.00041699999997035775 |
| get-workspace-files                                                      | 0.1822115999999869     | 0.23816699999997581    |
| get-all-workspace-files                                                  | 0.11563250000000153    | 0.01024999999992815    |
| create-project-graph-async >> build-project-graph-using-project-file-map | 1.089012540000001      | 1.439333999999917      |
| read cache                                                               | 0.03531332000000248    | 0.05162500000005821    |
| build project graph                                                      | 0.9318992599999888     | 1.1137079999999742     |
| nx/js/dependencies-and-lockfile:createDependencies                       | 0.8159200399999986     | 0.9867080000000215     |
| build typescript dependencies                                            | 0.0021691199999963827  | 0.004333999999971638   |
| write cache                                                              | 0.8876400400000125     | 1.3697919999999613     |