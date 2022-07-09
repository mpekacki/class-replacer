import { Connection, RecordResult, SuccessResult } from "jsforce";

const username = process.argv[2];
const password = process.argv[3];
const whereClause = process.argv[4];
const regex = new RegExp(process.argv[5], "i");
const replacement = process.argv[6];
const conn = new Connection({
  loginUrl: "https://test.salesforce.com",
});

const run = async () => {
  console.log(`Connecting to Salesforce as ${username}`);
  await conn.login(username, password);
  console.log("Logged in");

  console.log("Querying ApexClass with WHERE " + whereClause);
  let records: any[] = await new Promise((resolve, reject) => {
    conn.tooling
      .sobject("ApexClass")
      .find(whereClause, ["Id", "Name", "Body"], (err, records) => {
        if (err) {
          reject(err);
        } else {
          resolve(records);
        }
      });
  });

  console.log("Found " + records.length + " classes matching criteria");
  console.log(`Replacing ${regex} with ${replacement}`);
  records = records.filter((record) => record["Body"].match(regex));
  console.log(`Found ${records.length} classes matching regex`);
  if (records.length === 0) {
    console.log("No classes to update");
    process.exit(0);
  }
  records.forEach((record) => {
    record["Body"] = record["Body"].replace(regex, replacement);
  });
  console.log("Creating MetadataContainer...");
  const containerResult = await conn.tooling.create(
    "MetadataContainer",
    [{ Name: "MyContainer" + new Date().getTime() }],
    {
      allOrNone: true,
    }
  );
  console.log("Created MetadataContainer: " + JSON.stringify(containerResult));
  const containerId = getResultId(containerResult);
  console.log("Will create ApexClassMember for each ApexClass");
  let batch: any[] = []; // when trying to create ~80 members at once, it may throw lock row error on container,
  const batchSize = 40; // so we need to split it into batches
  for (let i = 0, j = 0; i < records.length; i++, j++) {
    batch.push({
      Body: records[i]["Body"],
      MetadataContainerId: containerId,
      ContentEntityId: records[i]["Id"],
    });
    if (j == batchSize - 1 || i == records.length - 1) {
      console.log(`Creating ApexClassMember (${i + 1}/${records.length})...`);
      const memberResult = await conn.tooling.create("ApexClassMember", batch, {
        allOrNone: true,
        allowRecursive: true,
      });
      console.log("Created OK");
      j = -1;
      batch = [];
    }
  }
  console.log("Creating ContainerAsyncRequest...");
  const containerAsyncResult = await conn.tooling.create(
    "ContainerAsyncRequest",
    [
      {
        IsCheckOnly: false,
        MetadataContainerId: containerId,
      },
    ],
    { allOrNone: true }
  );
  console.log(
    "Created ContainerAsyncRequest: " + JSON.stringify(containerAsyncResult)
  );
  setInterval(() => {
    conn.tooling
      .sobject("ContainerAsyncRequest")
      .find({ Id: getResultId(containerAsyncResult) }, (err, records) => {
        if (err) {
          console.log(err);
        } else {
          const state = (records[0] as any)["State"];
          console.log("ContainerAsyncRequest state: " + state);
          let exitCode: number | null = null;
          if (state === "Completed") {
            console.log("ContainerAsyncRequest completed");
            exitCode = 0;
          } else if (state === "Failed") {
            console.log(
              `ContainerAsyncRequest failed, error: ${
                (records[0] as any)["ErrorMsg"]
              }`
            );
            exitCode = 1;
          }
          if (exitCode !== null) {
            const deployDetails = (records[0] as any)["DeployDetails"];
            if (deployDetails.componentFailures.length) {
              console.log("Component failures:");
              console.log(
                deployDetails.componentFailures.map((f: any) => ({
                  fullName: f.fullName,
                  problem: f.problem,
                }))
              );
            }
            console.log(
              `Number of component successes: ${deployDetails.componentSuccesses.length}`
            );
            console.log(
              `Number of component failures: ${deployDetails.componentFailures.length}`
            );
            if (state === "Completed") {
              console.log("Deployment succeeded");
            } else if (state === "Failed") {
              console.log("Deployment failed");
            }
            process.exit(exitCode);
          }
        }
      });
  }, 3000);
  function getResultId(containerResult: RecordResult | RecordResult[]) {
    return ((containerResult as RecordResult[])[0] as SuccessResult).id;
  }
};
run().catch((err) => {
  console.log(err);
});
