"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var jsforce_1 = require("jsforce");
var username = process.argv[2];
var password = process.argv[3];
var whereClause = process.argv[4];
var regex = new RegExp(process.argv[5], "i");
var replacement = process.argv[6];
var conn = new jsforce_1.Connection({
    loginUrl: "https://test.salesforce.com"
});
var run = function () { return __awaiter(void 0, void 0, void 0, function () {
    var records, containerResult, containerId, batch, batchSize, i, j, memberResult, containerAsyncResult;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Connecting to Salesforce as ".concat(username));
                return [4 /*yield*/, conn.login(username, password)];
            case 1:
                _a.sent();
                console.log("Logged in");
                console.log("Querying ApexClass with WHERE " + whereClause);
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        conn.tooling
                            .sobject("ApexClass")
                            .find(whereClause, ["Id", "Name", "Body"], function (err, records) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(records);
                            }
                        });
                    })];
            case 2:
                records = _a.sent();
                console.log("Found " + records.length + " classes matching criteria");
                console.log("Replacing ".concat(regex, " with ").concat(replacement));
                records = records.filter(function (record) { return record["Body"].match(regex); });
                console.log("Found ".concat(records.length, " classes matching regex"));
                if (records.length === 0) {
                    console.log("No classes to update");
                    process.exit(0);
                }
                records.forEach(function (record) {
                    record["Body"] = record["Body"].replace(regex, replacement);
                });
                console.log("Creating MetadataContainer...");
                return [4 /*yield*/, conn.tooling.create("MetadataContainer", [{ Name: "MyContainer" + new Date().getTime() }], {
                        allOrNone: true
                    })];
            case 3:
                containerResult = _a.sent();
                console.log("Created MetadataContainer: " + JSON.stringify(containerResult));
                containerId = containerResult[0].id;
                console.log("Will create ApexClassMember for each ApexClass");
                batch = [];
                batchSize = 20;
                i = 0, j = 0;
                _a.label = 4;
            case 4:
                if (!(i < records.length)) return [3 /*break*/, 7];
                batch.push({
                    Body: records[i]["Body"],
                    MetadataContainerId: containerId,
                    ContentEntityId: records[i]["Id"]
                });
                if (!(j == batchSize - 1 || i == records.length - 1)) return [3 /*break*/, 6];
                console.log("Creating ".concat(i + 1, "/").concat(records.length, " ApexClassMember..."));
                return [4 /*yield*/, conn.tooling.create("ApexClassMember", batch, {
                        allOrNone: true,
                        allowRecursive: true
                    })];
            case 5:
                memberResult = _a.sent();
                console.log("Created OK");
                j = -1;
                batch = [];
                _a.label = 6;
            case 6:
                i++, j++;
                return [3 /*break*/, 4];
            case 7:
                console.log("Creating ContainerAsyncRequest...");
                return [4 /*yield*/, conn.tooling.create("ContainerAsyncRequest", [
                        {
                            IsCheckOnly: false,
                            MetadataContainerId: containerId
                        },
                    ], { allOrNone: true })];
            case 8:
                containerAsyncResult = _a.sent();
                console.log("Created ContainerAsyncRequest: " + JSON.stringify(containerAsyncResult));
                setInterval(function () {
                    conn.tooling
                        .sobject("ContainerAsyncRequest")
                        .find({ Id: containerAsyncResult[0].id }, function (err, records) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            var state = records[0]["State"];
                            console.log("ContainerAsyncRequest state: " + state);
                            var exitCode = null;
                            if (state === "Completed") {
                                console.log("ContainerAsyncRequest completed");
                                exitCode = 0;
                            }
                            else if (state === "Failed") {
                                console.log("ContainerAsyncRequest failed, error: ".concat(records[0]["ErrorMsg"]));
                                exitCode = 1;
                            }
                            if (exitCode !== null) {
                                var deployDetails = records[0]["DeployDetails"];
                                if (deployDetails.componentFailures.length) {
                                    console.log("Component failures:");
                                    console.log(deployDetails.componentFailures.map(function (f) { return ({
                                        fullName: f.fullName,
                                        problem: f.problem
                                    }); }));
                                }
                                console.log("Number of component successes: ".concat(deployDetails.componentSuccesses.length));
                                console.log("Number of component failures: ".concat(deployDetails.componentFailures.length));
                                if (state === "Completed") {
                                    console.log("Deployment succeeded");
                                }
                                else if (state === "Failed") {
                                    console.log("Deployment failed");
                                }
                                process.exit(exitCode);
                            }
                        }
                    });
                }, 3000);
                return [2 /*return*/];
        }
    });
}); };
run()["catch"](function (err) {
    console.log(err);
});
