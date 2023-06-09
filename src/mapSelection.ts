import { TextSelection, Transaction } from "prosemirror-state"

export default function mapSelection(
  intercepted: Transaction,
  propagated: Transaction
): Transaction {
  if (intercepted.steps.length == 0) {
    // There are no steps so we can just set the selection on the propagated
    // transaction to the selection on the intercepted transaction
    return propagated.setSelection(intercepted.selection)
  }
  // get the selection at the start of the intercepted transasction by inverting the steps in it
  const anchor = intercepted.mapping.invert().map(intercepted.selection.anchor)
  const head = intercepted.mapping.invert().map(intercepted.selection.head)
  const $anchor = intercepted.docs[0].resolve(anchor)
  const $head = intercepted.docs[0].resolve(head)
  const initialSelection = new TextSelection($anchor, $head)

  // now map the initial selection through the propagated transaction
  const mapped = initialSelection.map(propagated.doc, propagated.mapping)
  return propagated.setSelection(mapped)
}
