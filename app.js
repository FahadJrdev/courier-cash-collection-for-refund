(function () {
  'use strict';

  var D = window.CASE_DATA;
  var app = document.getElementById('app');

  function money(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function day(ts) {
    if (!ts) { return '—'; }
    var m = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) { return dayOnly(ts); }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ', ' + m[4] + ':' + m[5];
  }

  function dayOnly(ts) {
    var m = String(ts || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) { return String(ts || '—'); }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(m[3]) + ' ' + months[Number(m[2]) - 1];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* "2026-09-11" -> "11 September", so the window is written from the data and never retyped. */
  function windowLabel(date, short) {
    var m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) { return String(date || ''); }
    var full = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
    var abbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(m[3]) + ' ' + (short ? abbr : full)[Number(m[2]) - 1];
  }

  function byBalance() {
    return D.order.map(function (id) { return D.couriers[String(id)]; })
      .filter(function (c) { return !!c; });
  }

  /* ---------------- home ---------------- */

  function renderHome() {
    var owing = byBalance().filter(function (c) { return c.balance > 0.005; });
    var max = owing.length ? owing[0].balance : 1;

    var rows = owing.map(function (c, i) {
      var meta = c.receipts_count + (c.receipts_count === 1 ? ' receipt' : ' receipts');
      if (c.in_till > 0.005) { meta += ' · ' + money(c.in_till) + ' of it already in our till'; }
      if (c.last_settled) { meta += ' · last settled ' + dayOnly(c.last_settled); }
      return '<button class="row" data-id="' + c.id + '">' +
        '<span class="rank">' + (i + 1) + '</span>' +
        '<span class="who"><span class="nm">' + esc(c.name) + '</span>' +
        '<span class="meta">' + meta + '</span></span>' +
        '<span class="amt">' + money(c.to_collect) + '</span>' +
        '<span class="bar"><span style="width:' + Math.max(2, (c.balance / max) * 100) + '%"></span></span>' +
        '<span class="chev" aria-hidden="true">›</span>' +
        '</button>';
    }).join('');

    app.innerHTML =
      '<div class="stack">' +

        '<div class="stack-sm">' +
          '<h1>The fix is live. This is what is actually left to collect.</h1>' +
          '<p class="lede">The refund bug was fixed on ' + windowLabel(D.fix_deployed) + ' and the ledger has been ' +
          'correct since. Every figure here is rebuilt from production data for ' + windowLabel(D.window[0]) +
          ' to ' + windowLabel(D.window[1]) + ' and reconciles to the cash desk\'s own screen. ' +
          'What follows is where the money stands today — not what the bug cost.</p>' +
        '</div>' +

        '<div class="figures">' +
          '<div class="figure is-owed"><span class="v">' + money(D.to_collect) + '</span><span class="k">TJS to collect from couriers</span></div>' +
          '<div class="figure is-good"><span class="v">' + money(D.total_in_till) + '</span><span class="k">TJS already in our till — book it, do not collect it again</span></div>' +
          '<div class="figure"><span class="v">' + money(D.owed_by_us) + '</span><span class="k">TJS we owe ' + D.owed_list.length + ' couriers</span></div>' +
          '<div class="figure"><span class="v">' + money(D.refund_cash) + '</span><span class="k">TJS of refund cash the fix put back, over ' + D.refund_orders + ' orders</span></div>' +
        '</div>' +

        '<div class="note good">' +
          '<h3>Is the fix actually working? Three checks</h3>' +
          '<div class="scroll"><table><thead><tr><th>Check</th><th>Result</th></tr></thead><tbody>' +
            '<tr><td><strong>The symptom is gone.</strong> When the bug bit, the cashier wrote ' +
              '"the report says X but the courier app says Y" on the receipt.</td>' +
              '<td class="num"><strong>' + D.disc_pre + '</strong> such notes before the fix, ' +
              '<strong>' + D.disc_post + '</strong> after</td></tr>' +
            '<tr><td><strong>The refund cash is back.</strong> Orders delivered for cash, then refunded or cancelled — ' +
              'the money the old code erased.</td>' +
              '<td class="num">' + D.refund_orders + ' orders, <strong>' + money(D.refund_cash) + '</strong> now inside <em>collected</em></td></tr>' +
            '<tr><td><strong>The arithmetic reconciles.</strong> Every receipt written since the fix, rebuilt from raw ' +
              'orders and history against <em>collected − accepted − fee + paid</em>.</td>' +
              '<td class="num"><strong>' + D.reconciled + ' of ' + D.reconciled_of + '</strong> match to the cent</td></tr>' +
          '</tbody></table></div>' +
          '<p>Since the fix, ' + D.post_fix_reversals + ' more delivered cash orders were reversed (' +
          money(D.post_fix_reversal_cash) + ' TJS). Their cash stayed on the courier\'s balance, which is the ' +
          'behaviour we wanted: <strong>a refund is our cost, not a discount on what the courier owes.</strong></p>' +
        '</div>' +

        '<div class="note collect">' +
          '<h3>What to ask each courier for</h3>' +
          '<p>The left column is what the courier report puts on screen today. The middle column is cash already ' +
          'sitting in our till against a receipt that recorded less than the cashier took — it is ' +
          '<strong>not</strong> collectable twice. The right-hand column is the figure to ask for.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Courier</th><th class="r">Report shows</th><th class="r">Already in our till</th><th class="r">Ask him for</th>' +
          '</tr></thead><tbody>' +
          owing.map(function (c) {
            return '<tr><td>' + esc(c.name) + '</td>' +
              '<td class="r">' + money(c.balance) + '</td>' +
              '<td class="r' + (c.in_till > 0.005 ? ' gap' : '') + '">' + (c.in_till > 0.005 ? money(c.in_till) : '—') + '</td>' +
              '<td class="r collect-amt">' + money(c.to_collect) + '</td></tr>';
          }).join('') +
          '</tbody><tfoot><tr>' +
            '<td>Total</td>' +
            '<td class="r">' + money(D.owed_to_us) + '</td>' +
            '<td class="r gap">' + money(D.total_in_till) + '</td>' +
            '<td class="r collect-amt">' + money(D.to_collect) + '</td>' +
          '</tr></tfoot></table></div>' +
          '<p class="hint">Every courier with a balance is listed, not only the ones the bug touched. ' +
          'Tap any name below for his receipts and the notes the cashier wrote at the desk.</p>' +
        '</div>' +

        '<div class="note is-warn">' +
          '<h3>The one thing still open: ' + money(D.total_in_till) + ' TJS already in our till</h3>' +
          '<p>In August the report understated what these ' + D.till_couriers.length + ' couriers owed, because the bug had ' +
          'erased refunded cash from it. The cashier saw the higher figure on the courier\'s own phone and took ' +
          '<strong>that</strong> — but the desk form caps the entry at the balance on screen, so he could only record ' +
          'the smaller number and wrote the real one in the note.</p>' +
          '<p>On every one of those ' + D.till_receipts + ' receipts the recorded amount equals the balance shown ' +
          '<em>to the cent</em> — the field was pushed to its ceiling. And the shortfall on each equals exactly the ' +
          'refund cash the old code had erased by that date. Now that the ledger is correct, it asks for that money again.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Courier</th><th class="r">Balance today</th><th class="r">Already paid, unrecorded</th>' +
            '<th class="r">Truly left to collect</th><th>Receipts it came from</th>' +
          '</tr></thead><tbody>' +
          D.till_couriers.map(function (t) {
            return '<tr class="flag"><td>' + esc(t.name) + '</td>' +
              '<td class="r">' + money(t.balance) + '</td>' +
              '<td class="r gap">' + money(t.total) + '</td>' +
              '<td class="r collect-amt">' + money(t.after) + '</td>' +
              '<td class="num">' + t.receipts.join(', ') + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<p class="bridge"><strong>How to clear it — no SQL, no editing old receipts.</strong> ' +
          'Take the cash at the desk as an ordinary acceptance, with a comment naming the August receipts it covers. ' +
          'The balance is already on screen, the cap allows it, and Collection Histories gets a proper dated receipt ' +
          'with the cashier\'s name on it. Editing R-029 to say a different number would falsify the record of that ' +
          'day and destroy the evidence the bug existed; an adjusting entry keeps both truths.</p>' +
          '<p class="hint">Before booking it, confirm the August till. The shortfall matching the erased refund cash ' +
          'to the cent proves the cashier was reacting to the real bug — it does not by itself prove where the cash landed.</p>' +
        '</div>' +

        (D.stragglers && D.stragglers.length ?
        '<div class="note is-warn">' +
          '<h3>Not a bug, but worth chasing: ' + D.stragglers.length + ' couriers have not settled in a while</h3>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Courier</th><th>Last settled</th><th class="r">Holding</th><th class="r">Collected since</th>' +
          '</tr></thead><tbody>' +
          D.stragglers.map(function (s) {
            return '<tr class="flag"><td>' + esc(s.name) + '</td>' +
              '<td class="num">' + dayOnly(s.since) + '</td>' +
              '<td class="r gap">' + money(s.holding) + '</td>' +
              '<td class="r">' + money(s.uncollected) + ' over ' + s.orders + ' orders</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<p>Nothing is broken here — they simply have not come to the desk. It is the largest single item on the ' +
          'whole list, and it is ordinary cash, not refund residue.</p>' +
        '</div>' : '') +

        (D.owed_list && D.owed_list.length ?
        '<div class="note">' +
          '<h3>We owe ' + D.owed_list.length + ' couriers ' + money(D.owed_by_us) + ' TJS</h3>' +
          '<p>Delivery fees are earned on all three delivery types, but cash only comes back from cash-on-delivery ' +
          'home delivery. A courier who mostly works pickup points therefore drifts into credit. The payout side of ' +
          'the desk exists and works — it has been used once.</p>' +
          '<div class="scroll"><table><thead><tr><th>Courier</th><th class="r">We owe him</th></tr></thead><tbody>' +
          D.owed_list.map(function (o) {
            return '<tr><td>' + esc(o.name) + '</td><td class="r collect-amt">' + money(o.amount) + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
        '</div>' : '') +

        '<div class="stack-sm">' +
          '<h2>Every courier who owes something</h2>' +
          '<p class="hint">Amounts are what to ask him for — balance less anything already in our till. ' +
          'Tap a name for his receipts, his notes, and the orders behind the figure.</p>' +
          '<div class="list">' + rows +
            '<div class="list-foot"><span></span><span>To collect</span><span class="amt">' + money(D.to_collect) + '</span><span></span><span></span></div>' +
          '</div>' +
        '</div>' +

        '<div class="note good">' +
          '<h3>What changed since the 12 September case file</h3>' +
          '<p>That report described the damage: ' + '65 orders and 7,052.76 TJS erased from the ledger, with 5,012.66 ' +
          'still out with the couriers. It was written before the fix reached production.</p>' +
          '<p>This one describes the position afterwards. The erased cash is back in the ledger and being asked for. ' +
          'The three hand corrections it called for — P-001, R-242 and R-249 — are done. ' +
          'The ' + D.till_receipts + ' receipts it flagged are the only item still outstanding, and the way to clear ' +
          'them is a normal acceptance at the desk.</p>' +
          '<p class="hint">One correction to the earlier reading: a <em>partial</em> refund on an order that stays ' +
          'delivered never leaked anything. The order keeps its delivered status, so the full cash stayed in ' +
          '<em>collected</em> the whole time and the courier paid it. Only a refund that flipped the order out of ' +
          '<em>delivered</em> ever erased money.</p>' +
        '</div>' +

      '</div>';

    Array.prototype.forEach.call(app.querySelectorAll('.row'), function (b) {
      b.addEventListener('click', function () { location.hash = '#/courier/' + b.getAttribute('data-id'); });
    });
  }

  /* ---------------- courier detail ---------------- */

  function renderCourier(id) {
    var c = D.couriers[String(id)];
    if (!c) { renderHome(); return; }

    var receipts = c.receipts.slice().reverse().map(function (r) {
      return '<tr><td class="num">' + esc(r.receipt) + '</td>' +
        '<td class="num">' + day(r.at) + '</td>' +
        '<td class="r">' + money(r.asked) + '</td>' +
        '<td class="r">' + money(r.paid) + '</td>' +
        '<td class="r' + (Math.abs(r.left) > 0.005 ? ' gap' : '') + '">' + money(r.left) + '</td>' +
        '<td class="note-cell">' + (r.note ? esc(r.note) : '') + '</td></tr>';
    }).join('');

    var refunds = c.refunds.map(function (r) {
      return '<tr><td class="num">' + esc(r.code) + '</td>' +
        '<td class="r">' + money(r.amount) + '</td>' +
        '<td class="num">' + day(r.delivered_at) + '</td>' +
        '<td class="num">' + esc(r.status) + '</td></tr>';
    }).join('');

    app.innerHTML =
      '<div class="stack">' +
        '<a class="back" href="#" onclick="location.hash=\'\';return false;">‹ All couriers</a>' +

        '<div class="stack-sm">' +
          '<h1>' + esc(c.name) + '</h1>' +
          '<p class="lede">' + (c.phone ? esc(c.phone) + ' · ' : '') + c.deliveries + ' cash deliveries · ' +
          c.receipts_count + ' receipts' +
          (c.last_settled ? ' · last settled ' + dayOnly(c.last_settled) + ' on ' + esc(c.last_receipt) : '') + '</p>' +
        '</div>' +

        '<div class="figures">' +
          '<div class="' + (c.to_collect > 0.005 ? 'figure is-owed' : 'figure is-good') + '">' +
            '<span class="v">' + money(c.to_collect) + '</span><span class="k">TJS to ask him for</span></div>' +
          (c.in_till > 0.005 ?
          '<div class="figure is-good"><span class="v">' + money(c.in_till) + '</span><span class="k">TJS of his already in our till</span></div>' : '') +
          '<div class="figure"><span class="v">' + money(c.balance) + '</span><span class="k">TJS the report shows</span></div>' +
        '</div>' +

        '<div class="note">' +
          '<h3>How the balance is built</h3>' +
          '<div class="scroll"><table><tbody>' +
            '<tr><td>Cash collected at the door</td><td class="r">' + money(c.collected) + '</td></tr>' +
            '<tr><td>Handed in at the desk</td><td class="r">− ' + money(c.accepted) + '</td></tr>' +
            '<tr><td>Delivery fees he earned</td><td class="r">− ' + money(c.fee) + '</td></tr>' +
            '<tr><td>Paid out to him</td><td class="r">+ ' + money(c.paid) + '</td></tr>' +
            '<tr class="flag"><td><strong>Balance</strong></td><td class="r collect-amt">' + money(c.balance) + '</td></tr>' +
          '</tbody></table></div>' +
          (c.uncollected_since > 0.005 ?
          '<p class="hint">' + money(c.uncollected_since) + ' of that is from ' + c.orders_since +
          ' deliveries made since his last receipt — cash he is still legitimately carrying.</p>' : '') +
        '</div>' +

        (c.till_rows && c.till_rows.length ?
        '<div class="note is-warn">' +
          '<h3>' + money(c.in_till) + ' TJS of his is already in our till</h3>' +
          '<p>On these receipts the recorded amount equals the balance the screen showed him, to the cent — the form ' +
          'would go no higher. The cashier took the figure from the courier\'s own app and wrote it in the note. ' +
          'Each shortfall equals the refund cash the old code had erased by that date.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Receipt</th><th>Date</th><th class="r">Recorded</th><th class="r">Courier app showed</th><th class="r">Shortfall</th>' +
          '</tr></thead><tbody>' +
          c.till_rows.map(function (t) {
            return '<tr class="flag"><td class="num">' + esc(t.receipt) + '</td>' +
              '<td class="num">' + dayOnly(t.date) + '</td>' +
              '<td class="r">' + money(t.recorded) + '</td>' +
              '<td class="r">' + money(t.should_be) + '</td>' +
              '<td class="r gap">' + money(t.diff) + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<p>Ask him for <strong>' + money(c.to_collect) + '</strong>, not ' + money(c.balance) + '. ' +
          'Book the ' + money(c.in_till) + ' as its own acceptance with a note naming these receipts.</p>' +
        '</div>' : '') +

        (refunds ?
        '<div class="note">' +
          '<h3>' + c.refund_orders + ' of his deliveries were refunded or cancelled afterwards (' + money(c.refund_cash) + ' TJS)</h3>' +
          '<p>He took this cash at the door and still owes it. The old report dropped these orders; it no longer does.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Order</th><th class="r">Amount</th><th>Delivered</th><th>Ended as</th>' +
          '</tr></thead><tbody>' + refunds + '</tbody></table></div>' +
        '</div>' : '') +

        '<div class="stack-sm">' +
          '<h2>Every receipt at the desk</h2>' +
          '<p class="hint">"Asked" is the balance the screen showed when he arrived. "Left" is what remained after he paid.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Receipt</th><th>When</th><th class="r">Asked</th><th class="r">Paid</th><th class="r">Left</th><th>Cashier\'s note</th>' +
          '</tr></thead><tbody>' + receipts + '</tbody></table></div>' +
        '</div>' +

      '</div>';
  }

  /* ---------------- routing ---------------- */

  function setWindowLabel() {
    var el = document.getElementById('window-label');
    if (el) {
      el.textContent = windowLabel(D.window[0], true) + ' – ' + windowLabel(D.window[1], true) +
        ' · fixed ' + windowLabel(D.fix_deployed, true);
    }
  }

  function route() {
    var m = String(location.hash || '').match(/^#\/courier\/(\d+)/);
    if (m) { renderCourier(m[1]); } else { renderHome(); }
    window.scrollTo(0, 0);
  }

  setWindowLabel();
  window.addEventListener('hashchange', route);
  route();
})();
