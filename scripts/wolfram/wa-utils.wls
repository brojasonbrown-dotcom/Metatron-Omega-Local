#!/usr/bin/env wolframscript
(* Wolfram|Alpha utilities for the compute-engine project.
   These run inside the Wolfram kernel and complement the Python client. *)

BeginPackage["ComputeEngine`WolframAlpha`"];

(* Public API *)
WAQuery::usage = "WAQuery[query_String] returns a Dataset of pods with titles and plaintext.";
WASimple::usage = "WASimple[query_String] returns the plain-text answer.";
WAUnits::usage = "WAUnits[query_String, unit_String] returns the answer in specified units.";
WAToWolfram::usage = "WAToWolfram[query_String] returns the Wolfram Language input string.";
WAAssumptions::usage = "WAAssumptions[query_String] returns possible assumptions for disambiguation.";

Begin["`Private`"];

$WAAppID = "WX4LH6W5AU";

(* Build the base URL with authentication *)
$url[endpoint_String] := "https://api.wolframalpha.com/" <> endpoint <> "?appid=" <> $WAAppID;

(* ── Simple / Short Answer ─────────────────────────────────────────────── *)

WASimple[query_String] := Module[{resp},
  resp = URLRead[$url["v1/result"] <> "&i=" <> URLEncode[query], "Body"];
  If[StringQ[resp], StringTrim[resp], "No result"]
];

WAUnits[query_String, unit_String] := Module[{resp},
  resp = URLRead[$url["v1/result"] <> "&i=" <> URLEncode[query] <> "&units=" <> unit, "Body"];
  If[StringQ[resp], StringTrim[resp], "No result"]
];

(* ── Full Query ─────────────────────────────────────────────────────────── *)

WAQuery[query_String] := Module[{resp, json, pods},
  resp = URLRead[$url["v2/query"] <> "&input=" <> URLEncode[query] <> "&output=json", "Body"];
  json = ImportString[resp, "JSON"];
  pods = "pods" /. ("queryresult" /. json);
  Dataset[
    <|"title" -> ("title" /. #), "plaintext" -> ("plaintext" /. ("subpods" /. #)[[1]])|> & /@ pods
  ]
];

(* ── Wolfram Language Input ─────────────────────────────────────────────── *)

WAToWolfram[query_String] := Module[{resp, json, pods, inputPod},
  resp = URLRead[$url["v2/query"] <> "&input=" <> URLEncode[query] <> "&output=json", "Body"];
  json = ImportString[resp, "JSON"];
  pods = "pods" /. ("queryresult" /. json);
  inputPod = SelectFirst[pods, ("id" /. #) == "Input" &];
  If[MissingQ[inputPod],
    "No Wolfram Language input found",
    "plaintext" /. ("subpods" /. inputPod)[[1]]
  ]
];

(* ── Assumptions (disambiguation) ──────────────────────────────────────── *)

WAAssumptions[query_String] := Module[{resp, json, assumptions},
  resp = URLRead[$url["v2/query"] <> "&input=" <> URLEncode[query] <> "&output=json", "Body"];
  json = ImportString[resp, "JSON"];
  assumptions = "assumptions" /. ("queryresult" /. json);
  If[assumptions === "assumptions" || MissingQ[assumptions],
    {},
    ("word" /. #) & /@ ("values" /. assumptions)
  ]
];

End[];
EndPackage[];

(* ── Demo (uncomment to run) ─────────────────────────────────────────────── *)
(*
Print[WASimple["population of France"]];
Print[WASimple["integrate sin(x)^4"]];
Print[WAUnits["distance from Earth to Mars", "km"]];
Print[WAToWolfram["integrate sin(x)^4 from 0 to 2"]];
*)
