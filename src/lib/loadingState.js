// place files you want to import through the `$lib` alias in this folder.
import { writable } from "svelte/store";

function createLoading() {
    let { subscribe, update } = writable(0)

    return {
        subscribe,
        show:() => { update((lv) => (lv+1)) },
        hide:() => { update((lv) => (lv-1)) }
    }
}

export const loadingState = createLoading()