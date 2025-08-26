let greet = "Hello" |> print

let addOne = add(1, 2) |> print

let main = do! {
    greet
    addOne
}
