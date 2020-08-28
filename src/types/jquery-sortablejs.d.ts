import Sortable from "sortablejs";

declare global {
    interface JQuery<TElement = HTMLElement> extends Iterable<TElement> {
        sortable(options?: Partial<Sortable.Options> | string): any
    }
}